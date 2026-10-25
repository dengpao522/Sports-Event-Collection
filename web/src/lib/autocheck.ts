/**
 * 采集线索自动核对（FR-08 自我核对）
 * ===============================================================
 * 对 type=CRAWLER_TIP 的待审线索逐条进行链接级核验与规则评分，
 * 把「人工逐条核对」压缩为「人工只看机器拿不准的少数条目」。
 *
 * 核验流程（每条线索）：
 *  1. 线索 contact 是搜狗中转链接 → GET 后从 JS 片段解析出微信文章真实 URL
 *     （搜狗中转页用 window.location 拼接跳转，非 302）
 *  2. 抓微信文章页（公开网页，无需登录）→ 提取标题 / 发布时间 / 正文文本
 *  3. 规则评分：
 *     - 发布时间距今 > 200 天，或正文年份全旧        → AUTO_REJECT（历史旧文）
 *     - 正文含「报名」且含「截止/开启/启动/开始/进行」→ AUTO_PASS（报名活动线索）
 *     - 其余（链接失效/字段不足/拿不准）              → NEED_HUMAN（转人工）
 *
 * 每批处理 BATCH 条（默认 25），避免单次请求过长；多次点击继续核对剩余。
 */

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  "Accept-Language": "zh-CN,zh;q=0.9",
};

const BATCH = 25;
const MAX_AGE_DAYS = 200; // 发布时间超过该天数视为历史旧文

export interface AutocheckSummary {
  checked: number;
  autoPass: number;
  autoReject: number;
  needHuman: number;
  remaining: number;
}

interface ArticleInfo {
  title: string;
  publishTime: Date | null;
  text: string;
}

/** 抓微信文章页，提取标题 / 发布时间 / 正文文本 */
async function fetchWeixinArticle(url: string): Promise<ArticleInfo | null> {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return null;
  const html = await r.text();

  const titleMatch =
    html.match(/<h1[^>]*id="activity-name"[^>]*>([\s\S]*?)<\/h1>/) ||
    html.match(/<meta property="og:title" content="([^"]*)"/);
  const title = (titleMatch?.[1] ?? "").trim();

  // 发布时间：js 变量或 publish_time 元素
  const timeMatch =
    html.match(/publish_time\s*=\s*["']([^"']+)["']/) ||
    html.match(/var\s+ct\s*=\s*"?(\d{10})"?/);
  let publishTime: Date | null = null;
  if (timeMatch) {
    if (/^\d{10}$/.test(timeMatch[1])) {
      publishTime = new Date(Number(timeMatch[1]) * 1000);
    } else {
      const d = new Date(timeMatch[1].replace(/-/g, "/"));
      publishTime = isNaN(d.getTime()) ? null : d;
    }
  }

  // 正文：#js_content 文本（去标签）
  const contentMatch = html.match(/<div[^>]*id="js_content"[^>]*>([\s\S]*?)<script/);
  const text = contentMatch
    ? contentMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 3000)
    : "";

  if (!title && !publishTime && !text) return null;
  return { title, publishTime, text };
}

/** 对一批待审采集线索执行自动核对 */
export async function autocheckBatch(): Promise<AutocheckSummary> {
  const { prisma } = await import("./prisma");
  const pending = await prisma.submission.findMany({
    where: { type: "CRAWLER_TIP", status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });
  const remaining = await prisma.submission.count({
    where: { type: "CRAWLER_TIP", status: "PENDING" },
  });

  const summary: AutocheckSummary = {
    checked: 0,
    autoPass: 0,
    autoReject: 0,
    needHuman: 0,
    remaining: Math.max(0, remaining - pending.length),
  };

  const now = Date.now();
  for (const sub of pending) {
    summary.checked += 1;
    let verdict: "AUTO_PASS" | "AUTO_REJECT" | "NEED_HUMAN" = "NEED_HUMAN";
    let note = "";

    try {
      if (sub.contact.includes("weixin.sogou.com")) {
        // 历史遗留：搜狗中转链接 token 与采集会话绑定且时效短，事后无法解析
        note = "搜狗中转链接已过期（需在采集时当场解析），请人工点击核对";
      } else if (sub.contact.includes("reg.zuicool.com")) {
        // 最酷详情页为稳定直链：确认页面存在与报名状态
        const r = await fetch(sub.contact, { headers: UA });
        if (!r.ok) {
          note = `最酷详情页返回 HTTP ${r.status}，可能已下线，请人工确认`;
        } else {
          const html = await r.text();
          if (/报名中/.test(html)) {
            verdict = "AUTO_PASS";
            note = "最酷详情页当前状态为「报名中」，与线索一致";
          } else if (/已截止|报名结束|已结束/.test(html)) {
            verdict = "AUTO_REJECT";
            note = "最酷详情页显示报名已截止/活动已结束";
          } else {
            note = "最酷详情页可达，但未识别到明确报名状态，请人工确认";
          }
        }
      } else if (sub.contact.includes("mp.weixin.qq.com")) {
        // 微信文章公开页直抓（采集时已解析为稳定直链）
        const article = await fetchWeixinArticle(sub.contact);
        if (!article) {
          note = "原文链接无法解析或已删除，请人工点击核对";
        } else {
          const joined = `${article.title} ${article.text}`;
          const years = new Set([...joined.matchAll(/20\d{2}/g)].map((m) => m[0]));
          const validYears = years.has("2026") || years.has("2027");

          if (article.publishTime) {
            const ageDays = Math.floor((now - article.publishTime.getTime()) / 86400_000);
            if (ageDays > MAX_AGE_DAYS) {
              verdict = "AUTO_REJECT";
              note = `文章发布于 ${article.publishTime.toISOString().slice(0, 10)}（超过 ${MAX_AGE_DAYS} 天），历史旧文`;
            }
          }
          if (verdict !== "AUTO_REJECT" && years.size > 0 && !validYears) {
            verdict = "AUTO_REJECT";
            note = `正文年份仅含 ${[...years].join("/")}，为历史旧文`;
          }
          if (verdict === "NEED_HUMAN") {
            const hasSignup = article.text.includes("报名");
            const hasSignal = /截止|开启|启动|开始|进行中/.test(article.text);
            if (hasSignup && hasSignal) {
              verdict = "AUTO_PASS";
              const t = article.publishTime
                ? `发布于 ${article.publishTime.toISOString().slice(0, 10)}`
                : "发布时间未知";
              note = `${t}，正文含报名信息（原文标题：${article.title.slice(0, 40) || "无"}）`;
            } else {
              note = `正文无明确报名动作（原文标题：${article.title.slice(0, 40) || "无"}），请人工判断`;
            }
          }
        }
      } else {
        note = "来源链接暂不支持自动核验，请人工点击核对";
      }
    } catch (e) {
      note = `核验异常：${e instanceof Error ? e.message.slice(0, 60) : "未知"}`;
    }

    await prisma.submission.update({
      where: { id: sub.id },
      data: {
        autoStatus: verdict,
        autoNote: note,
        autoCheckedAt: new Date(),
      },
    });
    if (verdict === "AUTO_PASS") summary.autoPass += 1;
    else if (verdict === "AUTO_REJECT") summary.autoReject += 1;
    else summary.needHuman += 1;

    await new Promise((r) => setTimeout(r, 800)); // 礼貌间隔
  }

  summary.remaining = Math.max(
    0,
    await prisma.submission.count({ where: { type: "CRAWLER_TIP", status: "PENDING" } }),
  );
  return summary;
}
