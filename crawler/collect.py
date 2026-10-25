# -*- coding: utf-8 -*-
"""
「全民运动」赛事线索采集器
===============================================================
定位：自动化"发现赛事线索"，替代人工刷小红书/公众号。
产出：新的赛事线索写入网站投稿表（Submission, type=CRAWLER_TIP），
      由运营在后台 /admin/submissions 人工核对后正式入库。

数据源（按可靠性排序）：
  1. zuicool  最酷报名平台按城市页 —— 结构化最好，路跑/越野主力源
  2. sogou    搜狗微信文章搜索 —— 公众号赛事推文主力源
             （Session 预热 ABTEST/SUID cookie 后低频连续请求实测稳定；
              触发验证码时自动跳过本轮，隔天重试）
  3. bing     必应普通关键词搜索 —— best-effort 补充
             （实测其中国区自然结果几乎不含小红书/公众号直链，产出有限）

去重：与库内赛事名比对 + 与已有线索的来源 URL 比对，只入新线索。
运行：在仓库根目录执行  python crawler/collect.py
      （可选参数 --city 南京 只采一城；--source zuicool,sogou,bing 选择数据源）
定时：Windows 任务计划每天跑一次即可（低频礼貌抓取，间隔 1.5-3 秒/请求）。
"""

import argparse
import re
import sqlite3
import sys
import time
import uuid
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ---------- 配置 ----------

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "web" / "prisma" / "dev.db"
COOKIE_FILE = Path(__file__).resolve().parent / "sogou_cookie.txt"  # 搜狗登录 Cookie（gitignore，不提交）
RSS_FILE = Path(__file__).resolve().parent / "rss_sources.txt"  # RSS feed 列表（每行一个 URL）

CITIES = [
    "上海", "杭州", "南京", "苏州", "无锡", "宁波",
    "常州", "徐州", "南通", "连云港", "淮安", "盐城", "扬州", "镇江", "泰州", "宿迁",
    "温州", "嘉兴", "湖州", "绍兴", "金华", "衢州", "舟山", "台州", "丽水",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
    "Accept-Language": "zh-CN,zh;q=0.9",
}

REQUEST_INTERVAL = 1.5  # 每次请求间隔（秒），礼貌抓取

# ---------- 轮转 ----------

def rotate_cities(cities: list[str], groups: int) -> list[str]:
    """分城轮转：按当天在一年中的序号对组数取模，选出今天要采的组。
    任务计划每天跑一次 --rotate 5 → 单日搜狗请求量降为全量的 1/5，
    5 天覆盖全部城市，从根本上避开搜狗的频率风控。"""
    day_index = time.localtime().tm_yday
    idx = day_index % groups
    picked = cities[idx::groups]
    log(f"[轮转] 今天采第 {idx + 1}/{groups} 组：{'、'.join(picked)}")
    return picked

# ---------- 工具 ----------

def log(msg: str) -> None:
    print(msg, flush=True)


def fetch(url: str, timeout: int = 20) -> str | None:
    """带容错的 GET，返回文本或 None"""
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout)
        if r.status_code != 200:
            log(f"    [跳过] HTTP {r.status_code} {url}")
            return None
        r.encoding = r.apparent_encoding or "utf-8"
        return r.text
    except Exception as e:  # 网络异常不中断整体采集
        log(f"    [异常] {type(e).__name__}: {url}")
        return None


def normalize_name(name: str) -> str:
    """赛事名归一化：去空白与全半角差异，用于粗去重"""
    return re.sub(r"\s+", "", name).lower()


# 当前有效年份：标题/摘要中出现的年份全都不在此列 → 判定为旧文丢弃
VALID_YEARS = {"2026", "2027"}
# 排除词：历史公告类推文（疫情退费/往届回顾等）对“发现新赛”是噪声
STALE_KEYWORDS = ("疫情", "退费", "退还", "退款", "回顾", "往年")
# 体育赛事关键词白名单：搜索源的标题/摘要必须至少命中一个，滤除旅游/百科/非体育报名噪声
SPORT_KEYWORDS = (
    "马拉松", "路跑", "越野", "骑行", "登山", "徒步", "铁人三项", "游泳",
    "足球", "篮球", "羽毛球", "网球", "乒乓球", "排球", "跑步", "桨板",
    "赛艇", "体育", "赛事", "联赛", "田径",
)


def is_stale_article(*texts: str) -> bool:
    """判断文章是否为无价值的旧文：含旧年份或历史公告关键词"""
    joined = "".join(texts)
    years = set(re.findall(r"20\d{2}", joined))
    if years and not (years & VALID_YEARS):
        return True  # 提到的年份全是旧的（如 2020/2024）
    return any(k in joined for k in STALE_KEYWORDS)


def is_sport_article(*texts: str) -> bool:
    """搜索源专用：标题/摘要必须含体育赛事关键词（滤除旅游/百科/奥数等噪声）"""
    joined = "".join(texts)
    return any(k in joined for k in SPORT_KEYWORDS)


# ---------- 数据源 1：最酷报名平台 ----------

def collect_zuicool(cities: list[str]) -> list[dict]:
    """抓取最酷各城市搜索页的赛事条目"""
    leads: list[dict] = []
    for city in cities:
        url = f"https://reg.zuicool.com/?q={city}"
        html = fetch(url)
        if not html:
            continue
        soup = BeautifulSoup(html, "lxml")
        blocks = soup.select(".reg-race-block")
        if not blocks:
            log(f"  [zuicool] {city}: 无报名中赛事")
            continue
        for b in blocks:
            a = b.select_one("a.race-name-a")
            if not a:
                continue
            h4 = a.select_one("h4")
            if not h4:
                continue
            span = h4.select_one("span.label")
            status = span.get_text(strip=True) if span else ""
            name = h4.get_text(strip=True)
            if span:
                name = name.replace(span.get_text(strip=True), "").strip()
            # 日期与地点：块内最后一个 <p>（含 <br> 分隔的两行）
            ps = b.find_all("p")
            info = ps[-1].get_text(" ", strip=True) if ps else ""
            parts = [x.strip() for x in info.split(" ") if x.strip()]
            # 文本形如 "2026年11月7日星期六 ~ 2026年11月8日星期日 浙江・湖州市德清县・xxx"
            m = re.search(r"\d{4}年\d{1,2}月\d{1,2}日.*", info)
            date_part, venue = "", ""
            if m:
                whole = m.group(0)
                vm = re.search(r"(浙江|江苏|上海|安徽)・(.+)$", whole)
                if vm:
                    venue = vm.group(0)
                    date_part = whole[: vm.start()].strip(" ~")
                else:
                    date_part = whole
            leads.append({
                "source": "zuicool",
                "city": city,
                "name": name,
                "status_label": status,
                "date_text": date_part,
                "venue": venue,
                "url": a.get("href", ""),
            })
        log(f"  [zuicool] {city}: {len(blocks)} 条")
        time.sleep(REQUEST_INTERVAL)
    return leads


# ---------- 数据源 2：搜狗微信文章搜索（公众号主力源） ----------

# 每城查询的关键词组：覆盖路跑与泛赛事两类推文
SOGOU_KEYWORDS = ["马拉松 报名", "赛事 报名", "越野 报名", "联赛 报名"]


def new_sogou_session() -> requests.Session:
    """建立搜狗会话：预热拿 ABTEST/SUID cookie；若配置了登录 Cookie 文件
    （浏览器登录搜狗后 F12 复制整串 Cookie 存入 crawler/sogou_cookie.txt），
    注入后享有登录态配额，验证码概率大幅降低。"""
    s = requests.Session()
    s.headers.update({**HEADERS, "Referer": "https://weixin.sogou.com/"})
    if COOKIE_FILE.exists():
        cookie_str = COOKIE_FILE.read_text(encoding="utf-8").strip()
        if cookie_str:
            s.headers["Cookie"] = cookie_str
            log("    [sogou] 已注入登录 Cookie")
    try:
        s.get("https://weixin.sogou.com/", timeout=20)
    except Exception as e:
        log(f"    [sogou] 预热失败: {type(e).__name__}")
    return s


def fetch_weixin_summary(article_url: str) -> str:
    """抓微信文章页公开正文，取前 240 字作为线索增强信息"""
    try:
        r = s_get(article_url)
        m = re.search(r'<div[^>]*id="js_content"[^>]*>([\s\S]*?)<script', r)
        if not m:
            return ""
        text = re.sub(r"<[^>]+>", " ", m.group(1))
        text = re.sub(r"\s+", " ", text.replace("&nbsp;", " ")).strip()
        return text[:240]
    except Exception:
        return ""


def s_get(url: str, timeout: int = 20) -> str:
    """带 UA 的 GET，返回文本；异常抛出由调用方处理"""
    r = requests.get(url, headers=HEADERS, timeout=timeout)
    r.encoding = r.apparent_encoding or "utf-8"
    return r.text


def collect_sogou_weixin(cities: list[str]) -> list[dict]:
    """搜狗微信文章搜索：公众号是赛事推文的发布主场，此源直接覆盖。
    命中条目当场解析中转链接（会话内有效）拿真实文章 URL 并抓取正文摘要，
    使后台自动核对无需再访问搜狗。"""
    leads: list[dict] = []
    s = new_sogou_session()
    blocked_once = False
    for city in cities:
        if blocked_once:
            break  # 验证码出现后同会话继续必被拦，直接结束本轮
        for kw in SOGOU_KEYWORDS:
            url = f"https://weixin.sogou.com/weixin?type=2&query={city}+{kw}"
            html = fetch(url)
            if html is None:
                continue
            if "antispider" in html or "验证码" in html[:3000]:
                log(f"  [sogou] {city}: 触发验证码，本轮搜狗源提前结束（建议隔天再跑）")
                blocked_once = True
                break
            soup = BeautifulSoup(html, "lxml")
            count = 0
            # 页面结构：div.news-box > ul.news-list > li；标题在 h3 > a[id^=sogou_vr_]
            for li in soup.select("ul.news-list > li"):
                a = li.select_one("h3 a") or li.select_one('a[id^="sogou_vr"]')
                if not a:
                    continue
                title = a.get_text(strip=True)
                if not title:
                    continue  # 图片空链接
                href = a.get("href", "")
                if href.startswith("/link"):
                    href = f"https://weixin.sogou.com{href}"
                # 摘要（搜狗无可靠日期行，时效靠年份过滤兜底）
                snippet = li.select_one(".txt-info")
                snippet_text = snippet.get_text(strip=True)[:200] if snippet else ""
                if is_stale_article(title, snippet_text):
                    continue
                if not is_sport_article(title, snippet_text):
                    continue  # 非体育赛事（旅游/百科/奥数等噪声）

                # 当场解析中转链接：真实微信文章 URL + 正文摘要（供后台自动核对）
                real_url = resolve_sogou_link(s, href)
                body_text = ""
                final_url = href
                if real_url:
                    final_url = real_url
                    body_text = fetch_weixin_summary(real_url)
                    time.sleep(REQUEST_INTERVAL)

                leads.append({
                    "source": "sogou_weixin",
                    "city": city if city in title else "",
                    "name": title,
                    "status_label": "公众号推文",
                    "date_text": "",
                    "venue": body_text or snippet_text,  # 优先正文实摘，失败退回搜索摘要
                    "url": final_url,
                })
                count += 1
            log(f"  [sogou] {city}（{kw}）: {count} 条")
            time.sleep(REQUEST_INTERVAL * 2)
    return leads


# ---------- 数据源 3：RSS 订阅（微信读书/wewe-rss 方案，公众号彻底稳定通道） ----------

def collect_rss() -> list[dict]:
    """抓取 rss_sources.txt 中配置的 RSS/Atom feed（来自自部署 wewe-rss / RSSHub）。
    部署一次微信读书扫码后，订阅的公众号有新文章即自动进入此通道——
    零风控、零验证码，是公众号监控的终极稳定方案。部署指引见 crawler/README.md。"""
    import xml.etree.ElementTree as ET

    if not RSS_FILE.exists():
        log("  [rss] 未配置 rss_sources.txt，跳过（部署指引见 crawler/README.md）")
        return []
    feeds = [ln.strip() for ln in RSS_FILE.read_text(encoding="utf-8").splitlines() if ln.strip() and not ln.startswith("#")]
    if not feeds:
        log("  [rss] rss_sources.txt 为空，跳过")
        return []

    leads: list[dict] = []
    for feed_url in feeds:
        html = fetch(feed_url)
        if not html:
            continue
        try:
            root = ET.fromstring(html)
        except Exception as e:
            log(f"    [rss] XML 解析失败: {type(e).__name__}")
            continue
        count = 0
        # RSS 2.0（<item>）与 Atom（<entry>）双格式兼容
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        items = root.findall(".//item") or root.findall(".//atom:entry", ns)
        for item in items:
            title_el = item.find("title")
            link_el = item.find("link")
            desc_el = item.find("description") or item.find("atom:summary", ns)
            title = (title_el.text or "").strip() if title_el is not None else ""
            link = (link_el.text or "").strip() if link_el is not None else ""
            if link_el is None:
                link_alt = item.find("atom:link", ns)
                link = link_alt.get("href", "") if link_alt is not None else ""
            summary = (desc_el.text or "").strip() if desc_el is not None else ""
            summary = re.sub(r"<[^>]+>", " ", summary)[:200]
            if not title or not link:
                continue
            if is_stale_article(title, summary):
                continue
            if not is_sport_article(title, summary):
                continue
            # 城市：从标题匹配 25 城名单，匹配不到留空由人工补
            city = next((c for c in CITIES if c in title), "")
            leads.append({
                "source": "rss",
                "city": city,
                "name": title,
                "status_label": "公众号推文（RSS）",
                "date_text": "",
                "venue": summary,
                "url": link,
            })
            count += 1
        log(f"  [rss] {feed_url[:60]}: {count} 条")
        time.sleep(REQUEST_INTERVAL)
    return leads


# ---------- 去重与入库 ----------

def load_existing() -> tuple[set[str], set[str]]:
    """读库内赛事名集合 + 已有线索的来源 URL 集合"""
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        names = {normalize_name(r[0]) for r in cur.execute("SELECT name FROM Event")}
        urls = {
            r[0] for r in cur.execute(
                "SELECT contact FROM Submission WHERE type='CRAWLER_TIP' AND contact != ''"
            )
        }
        return names, urls
    finally:
        conn.close()


def save_leads(leads: list[dict], existing_names: set[str], existing_urls: set[str]) -> tuple[int, int, int]:
    """新线索写入 Submission 表（type=CRAWLER_TIP），返回 (新增, 与库内赛事重复, 重复线索)"""
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        seen_urls: set[str] = set()
        inserted = dup_event = dup_lead = 0
        for lead in leads:
            url = lead["url"]
            if not url or url in existing_urls or url in seen_urls:
                dup_lead += 1 if url in existing_urls or url in seen_urls else 0
                continue
            if normalize_name(lead["name"]) in existing_names:
                dup_event += 1
                continue
            seen_urls.add(url)
            lines = [f"【采集线索】{lead['name']}"]
            if lead["date_text"]:
                lines.append(f"时间：{lead['date_text']}")
            if lead["venue"]:
                # zuicool 的该字段是真实地点，搜索源（sogou/bing）是文章摘要
                label = "地点" if lead["source"] == "zuicool" else "摘要"
                lines.append(f"{label}：{lead['venue']}")
            if lead["status_label"]:
                lines.append(f"平台状态：{lead['status_label']}")
            lines.append(f"来源：{lead['source']}（点击 contact 链接核对原文）")
            cur.execute(
                "INSERT INTO Submission (id, type, city, category, eventId, content, contact, status, reviewNote, createdAt, reviewedAt)"
                " VALUES (?, ?, ?, '', NULL, ?, ?, 'PENDING', '', datetime('now'), NULL)",
                (uuid.uuid4().hex, "CRAWLER_TIP", lead["city"], "\n".join(lines), url),
            )
            inserted += 1
        conn.commit()
        return inserted, dup_event, dup_lead
    finally:
        conn.close()


# ---------- 主流程 ----------

def main() -> None:
    parser = argparse.ArgumentParser(description="赛事线索采集器")
    parser.add_argument("--city", help="只采集指定城市")
    parser.add_argument("--source", default="zuicool", help="数据源：zuicool / sogou / rss / all（默认 zuicool）")
    parser.add_argument("--rotate", type=int, default=0, help="分城轮转组数（如 5 = 每天采 1/5 的城市），仅作用于搜狗等风控敏感源")
    args = parser.parse_args()

    cities = [args.city] if args.city else CITIES
    sources = args.source.split(",")

    # 轮转模式：风控敏感源（sogou）只采当日组；zuicool 无风控保持全量
    sogou_cities = rotate_cities(cities, args.rotate) if args.rotate > 0 else cities

    log(f"开始采集：{len(cities)} 城 × 数据源 [{args.source}]")
    leads: list[dict] = []
    if "zuicool" in sources or "all" in sources:
        leads += collect_zuicool(cities)
    if "sogou" in sources or "all" in sources:
        leads += collect_sogou_weixin(sogou_cities)
    if "rss" in sources or "all" in sources:
        leads += collect_rss()

    log(f"\n共抓取线索 {len(leads)} 条，开始去重入库…")
    existing_names, existing_urls = load_existing()
    inserted, dup_event, dup_lead = save_leads(leads, existing_names, existing_urls)
    log(f"完成：新增线索 {inserted} 条（与库内赛事重复跳过 {dup_event}，重复线索跳过 {dup_lead}）")
    log("请到后台 /admin/submissions 核对「采集线索」，确认后正式录入赛事。")
    sys.exit(0)


if __name__ == "__main__":
    main()
