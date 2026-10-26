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

# 全国其余地级行政区（与 web/src/lib/constants.ts SOON_CITIES 同步维护）
SOON_CITIES = [
    "北京", "天津", "重庆",
    "石家庄", "唐山", "秦皇岛", "邯郸", "邢台", "保定", "张家口", "承德", "沧州", "廊坊", "衡水",
    "太原", "大同", "阳泉", "长治", "晋城", "朔州", "晋中", "运城", "忻州", "临汾", "吕梁",
    "呼和浩特", "包头", "乌海", "赤峰", "通辽", "鄂尔多斯", "呼伦贝尔", "巴彦淖尔", "乌兰察布", "兴安盟", "锡林郭勒盟", "阿拉善盟",
    "沈阳", "大连", "鞍山", "抚顺", "本溪", "丹东", "锦州", "营口", "阜新", "辽阳", "盘锦", "铁岭", "朝阳", "葫芦岛",
    "长春", "吉林", "四平", "辽源", "通化", "白山", "松原", "白城", "延边",
    "哈尔滨", "齐齐哈尔", "鸡西", "鹤岗", "双鸭山", "大庆", "伊春", "佳木斯", "七台河", "牡丹江", "黑河", "绥化", "大兴安岭",
    "合肥", "芜湖", "蚌埠", "淮南", "马鞍山", "淮北", "铜陵", "安庆", "黄山", "滁州", "阜阳", "宿州", "六安", "亳州", "池州", "宣城",
    "福州", "厦门", "莆田", "三明", "泉州", "漳州", "南平", "龙岩", "宁德",
    "南昌", "景德镇", "萍乡", "九江", "新余", "鹰潭", "赣州", "吉安", "宜春", "抚州", "上饶",
    "济南", "青岛", "淄博", "枣庄", "东营", "烟台", "潍坊", "济宁", "泰安", "威海", "日照", "临沂", "德州", "聊城", "滨州", "菏泽",
    "郑州", "开封", "洛阳", "平顶山", "安阳", "鹤壁", "新乡", "焦作", "濮阳", "许昌", "漯河", "三门峡", "南阳", "商丘", "信阳", "周口", "驻马店",
    "武汉", "黄石", "十堰", "宜昌", "襄阳", "鄂州", "荆门", "孝感", "荆州", "黄冈", "咸宁", "随州", "恩施",
    "长沙", "株洲", "湘潭", "衡阳", "邵阳", "岳阳", "常德", "张家界", "益阳", "郴州", "永州", "怀化", "娄底", "湘西",
    "广州", "深圳", "珠海", "汕头", "佛山", "韶关", "湛江", "茂名", "肇庆", "惠州", "梅州", "汕尾", "河源", "阳江", "清远", "东莞", "中山", "潮州", "揭阳", "云浮",
    "南宁", "柳州", "桂林", "梧州", "北海", "防城港", "钦州", "贵港", "玉林", "百色", "贺州", "河池", "来宾", "崇左",
    "海口", "三亚", "三沙", "儋州",
    "成都", "自贡", "攀枝花", "泸州", "德阳", "绵阳", "广元", "遂宁", "内江", "乐山", "南充", "眉山", "宜宾", "广安", "达州", "雅安", "巴中", "资阳", "阿坝", "甘孜", "凉山",
    "贵阳", "六盘水", "遵义", "安顺", "毕节", "铜仁", "黔东南", "黔南", "黔西南",
    "昆明", "曲靖", "玉溪", "保山", "昭通", "丽江", "普洱", "临沧", "楚雄", "红河", "文山", "西双版纳", "大理", "德宏", "怒江", "迪庆",
    "拉萨", "日喀则", "昌都", "林芝", "山南", "那曲", "阿里",
    "西安", "铜川", "宝鸡", "咸阳", "渭南", "延安", "汉中", "榆林", "安康", "商洛",
    "兰州", "嘉峪关", "金昌", "白银", "天水", "武威", "张掖", "平凉", "酒泉", "庆阳", "定西", "陇南", "临夏", "甘南",
    "西宁", "海东", "海北", "黄南", "海南州", "果洛", "玉树", "海西",
    "银川", "石嘴山", "吴忠", "固原", "中卫",
    "乌鲁木齐", "克拉玛依", "吐鲁番", "哈密", "昌吉", "博尔塔拉", "巴音郭楞", "阿克苏", "克孜勒苏", "喀什", "和田", "伊犁", "塔城", "阿勒泰",
]

ALL_CITIES = CITIES + SOON_CITIES

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


def resolve_sogou_link(s: requests.Session, link_url: str) -> str:
    """当场解析搜狗中转链接（token 与会话绑定、时效极短，必须立即解析）。
    中转页通过 JS 拼接变量后 window.location.replace(url) 跳转到真实微信文章；
    解析失败返回空串（调用方保留搜狗中转 URL，由后台人工核对）。"""
    try:
        r = s.get(link_url, timeout=20)
        if r.status_code != 200:
            return ""
        if "weixin.qq.com" in r.url:
            return r.url  # 直接 302 到微信的情形
        text = r.text
        # 情形 1：多段字符串拼接变量（var url = '...'; url += '...';）
        frags = re.findall(r"\burl\s*\+?=\s*['\"]([^'\"]+)['\"]", text)
        joined = "".join(frags)
        if "weixin.qq.com" in joined:
            return joined
        # 情形 2：replace 里直接内联完整 URL
        m = re.search(r'window\.location\.replace\(\s*["\']([^"\']*weixin\.qq\.com[^"\']*)["\']', text)
        if m:
            return m.group(1)
        return ""
    except Exception as e:
        log(f"    [sogou] 中转解析异常: {type(e).__name__}")
        return ""


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
            # 搜索请求必须走同一 Session（携带预热 ABTEST/SUID 与可选登录 Cookie），否则易触发风控
            try:
                r = s.get(url, timeout=20)
                html = None
                if r.status_code == 200:
                    r.encoding = r.apparent_encoding or "utf-8"
                    html = r.text
            except Exception as e:
                log(f"    [sogou] 请求异常: {type(e).__name__}")
                html = None
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


# ---------- 数据源 4：全国全量（最酷首页，直接入库 Event） ----------

# 状态标签 → 库内状态映射
ZUICOOL_STATUS_MAP = {"报名中": "OPEN", "已截止": "CLOSED", "已结束": "FINISHED", "已关闭": "CLOSED"}
NATIONWIDE_SHEET = "最酷全国采集 2026-10-26"

# 赛事大全（zuicool.com/events）批次标记
EVENTS_SHEET = "最酷赛事大全 2026-10-26"


def infer_city_from_venue(venue: str) -> str:
    """从最酷地点行（如「浙江・温州市苍南县・xxx」）推断地级市名，
    优先匹配库内已知城市名单（含 SOON），匹配不到取「・」分隔的第二段。"""
    for c in ALL_CITIES:
        if c in venue:
            return c
    segs = venue.replace("浙江・", "").replace("江苏・", "").replace("上海・", "").split("・")
    if len(segs) >= 2:
        return segs[1].replace("市", "")
    return ""


# ---------- 中文日期解析（Python 版，与 web 端 parse-date.ts 口径一致） ----------

def parse_race_date_cn(text: str):
    """解析「2026年11月7日星期六」等，返回 ISO 字符串（Prisma DateTime 兼容）或 None。
    年份规则与 web 端一致：月份 1-2 月视为跨年归到下一年。"""
    if not text:
        return None
    m = re.search(r"(20\d{2})年(\d{1,2})月(\d{1,2})日", text)
    if not m:
        return None
    year, month, day = int(m[1]), int(m[2]), int(m[3])
    if month <= 2 and year < 2027:
        year += 1
    try:
        return f"{year:04d}-{month:02d}-{day:02d}T00:00:00.000Z"
    except ValueError:
        return None


def parse_deadline_cn(text: str):
    """从截止文本解析 ISO datetime（含 HH:MM 则带时间），失败返回 None"""
    if not text:
        return None
    m = re.search(r"(20\d{2})年(\d{1,2})月(\d{1,2})日(?:\s*(\d{1,2})[:：](\d{2}))?", text)
    if not m:
        return None
    year, month, day = int(m[1]), int(m[2]), int(m[3])
    hour = int(m[4]) if m[4] else 23
    minute = int(m[5]) if m[5] else 59
    try:
        return f"{year:04d}-{month:02d}-{day:02d}T{hour:02d}:{minute:02d}:00.000Z"
    except ValueError:
        return None


def parse_race_date_dot(text: str):
    """解析赛事大全卡片的「2026.11.14」点分 / 黑练日历的「2026-11-08」横线日期，返回 ISO 字符串或 None"""
    if not text:
        return None
    m = re.search(r"(20\d{2})[.\-](\d{1,2})[.\-](\d{1,2})", text)
    if not m:
        return parse_race_date_cn(text)
    year, month, day = int(m[1]), int(m[2]), int(m[3])
    if month <= 2 and year < 2027:
        year += 1
    try:
        return f"{year:04d}-{month:02d}-{day:02d}T00:00:00.000Z"
    except ValueError:
        return None


def parse_deadline_md_cn(text: str, race_iso: str | None):
    """解析赛事大全的「报名截止：11-06 12:00」（无年份）。
    年份从比赛日期推断：截止必然不晚于比赛；若截止月日大于比赛月日则视为跨年（比赛次年 1-2 月、截止在上一年底）。"""
    if not text:
        return None
    m = re.search(r"(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2})[:：](\d{2}))?", text)
    if not m:
        return None
    month, day = int(m[1]), int(m[2])
    hour = int(m[3]) if m[3] else 23
    minute = int(m[4]) if m[4] else 59
    year = int(race_iso[:4]) if race_iso else 2026
    if race_iso and (month, day) > (int(race_iso[5:7]), int(race_iso[8:10])):
        year -= 1
    try:
        return f"{year:04d}-{month:02d}-{day:02d}T{hour:02d}:{minute:02d}:00.000Z"
    except ValueError:
        return None


def sport_category(name: str) -> str:
    """从赛事名推断一级品类（与网站品类体系一致）"""
    if any(k in name for k in ("越野", "山径", "跑山", "山地")):
        return "跑步"  # 越野跑归跑步大类
    if any(k in name for k in ("马拉松", "路跑", "10公里", "10KM", "健康跑", "亲子跑", "欢乐跑", "半马", "全马", "迎新跑")):
        return "跑步"
    if any(k in name for k in ("骑行", "自行车", "骑游")):
        return "骑行"
    if any(k in name for k in ("徒步", "登山", "毅行", "登高")):
        return "户外"
    if any(k in name for k in ("游泳", "桨板", "赛艇", "皮划艇")):
        return "水上"
    if any(k in name for k in ("滑雪", "冰雪")):
        return "冰雪"
    if any(k in name for k in ("定向", "障碍赛", "斯巴达")):
        return "其他综合"
    if any(k in name for k in ("铁人三项", "铁三", "IRONMAN", "铁人")):
        return "其他综合"  # 铁三归其他综合大类
    return "其他综合"


# ---------- 数据源 6：黑练赛事日历（heilianapp.com，四品类全量直接入库） ----------

HEILIAN_CALENDARS = [
    ("/chinamarathon", "马拉松·路跑"),
    ("/gobichina", "越野跑"),
    ("/chinagranfondo", "自行车"),
    ("/chinatriathlon", "铁人三项"),
]
HEILIAN_SHEET = "黑练赛事日历 2026-10-26"
# 状态徽章文案 → 库内状态
HEILIAN_STATUS_MAP = {
    "正在报名": "OPEN",
    "报名即将结束": "OPEN",
    "火热报名中": "OPEN",
    "报名结束": "CLOSED",
    "已结束": "CLOSED",
    "即将开始": "UPCOMING",
    "未开始": "UPCOMING",
    "暂未报名": "UPCOMING",
}


def collect_heilian() -> list[dict]:
    """黑练（heilianapp.com）四品类赛事日历：单页全量（马拉松 480+/越野 400+），
    每条含名称/比赛日期/地点/报名状态徽章。只收今天及以后开赛的赛事。"""
    leads: list[dict] = []
    today = time.strftime("%Y-%m-%d")
    seen_ids: set[str] = set()
    for path, label in HEILIAN_CALENDARS:
        html = fetch(f"https://heilianapp.com{path}", timeout=25)
        if not html:
            log(f"  [黑练] {label}: 抓取失败")
            continue
        soup = BeautifulSoup(html, "lxml")
        count = 0
        for a in soup.select("a[href*='/events/']"):
            m = re.search(r"/events/(\d+)", a.get("href", ""))
            if not m:
                continue
            eid = m.group(1)
            if eid in seen_ids:
                continue  # 跨日历/卡片与列表重复的条目
            seen_ids.add(eid)
            # 两种形态：横排卡片（article>h3）与省份列表行（h2）
            h = a.select_one("h3") or a.select_one("h2")
            if not h:
                continue
            name = h.get_text(strip=True)
            div = a.select_one("div")
            date_span = a.select_one("span")
            venue = ""
            race_date = ""
            if div:
                date_span = div.select_one("span")
                vp = div.select_one("p")
                venue = vp.get_text(strip=True) if vp else ""
            if date_span:
                race_date = date_span.get_text(strip=True)
            if race_date and race_date < today:
                continue  # 历史赛事跳过（黑练列表含全年+往届）
            if not name:
                continue
            # 状态：优先徽章文案，无徽章的未来赛事视为待官宣
            status = ""
            for sp in a.select("span"):
                t = sp.get_text(strip=True)
                if t in HEILIAN_STATUS_MAP:
                    status = HEILIAN_STATUS_MAP[t]
                    break
            if not status:
                status = "UPCOMING"
            leads.append({
                "name": name,
                "status": status,
                "status_label": next((k for k, v in HEILIAN_STATUS_MAP.items() if v == status), "日历条目"),
                "date_text": race_date,
                "venue": venue,
                "city": infer_city_from_venue(venue),
                "category": sport_category(name),
                "deadline_text": "",
                "registerGuide": f"黑练赛事日历：https://heilianapp.com/events/{eid}",
                "source": "heilianapp",
                "sourceSheet": HEILIAN_SHEET,
                "url": f"https://heilianapp.com/events/{eid}",
            })
            count += 1
        log(f"  [黑练] {label}: 保留未来赛事 {count}（累计 {len(leads)}）")
        time.sleep(REQUEST_INTERVAL)
    return leads


def collect_zuicool_nationwide() -> list[dict]:
    """最酷全国首页：一次性抓取全国所有「报名中/已截止」赛事，直接返回结构化数据。
    与线索模式不同：本源字段完整（名称/日期/地点/状态），可直接入库为 Event。"""
    leads: list[dict] = []
    html = fetch("https://reg.zuicool.com/")
    if not html:
        return leads
    soup = BeautifulSoup(html, "lxml")
    for b in soup.select(".reg-race-block"):
        a = b.select_one("a.race-name-a")
        h4 = a.select_one("h4") if a else None
        if not a or not h4:
            continue
        span = h4.select_one("span.label")
        status_label = span.get_text(strip=True) if span else ""
        name = h4.get_text(strip=True)
        if span:
            name = name.replace(span.get_text(strip=True), "").strip()
        if not name:
            continue
        ps = b.find_all("p")
        info = ps[-1].get_text(" ", strip=True) if ps else ""
        m = re.search(r"(\d{4}年\d{1,2}月\d{1,2}日[^・]*)", info)
        date_text = m.group(1).strip(" ~") if m else ""
        vm = re.search(r"((?:浙江|江苏|上海|北京|天津|重庆|安徽|福建|江西|山东|河南|湖北|湖南|广东|广西|海南|四川|贵州|云南|西藏|陕西|甘肃|青海|宁夏|新疆|内蒙古|辽宁|吉林|黑龙江|山西|河北)・[^・]+(?:・[^・]+)?)", info)
        venue = vm.group(1) if vm else ""
        city = infer_city_from_venue(venue)
        leads.append({
            "name": name,
            "status_label": status_label,
            "status": ZUICOOL_STATUS_MAP.get(status_label, "UNVERIFIED"),
            "date_text": date_text,
            "venue": venue,
            "city": city,
            "category": sport_category(name),
            "registerGuide": f"最酷报名平台一键报名：{a.get('href', '')}",
            "source": "zuicool_nationwide",
            "url": a.get("href", ""),
        })
    log(f"  [zuicool 全国] {len(leads)} 条（含状态分布：{ {k: sum(1 for l in leads if l['status_label']==k) for k in set(l['status_label'] for l in leads)} }）")
    return leads


# ---------- 数据源 5：最酷赛事大全（zuicool.com/events，翻页全量直接入库） ----------

# 大全卡片状态 → 库内状态（「点此报名」=开放报名；meta 含「已截止」=关闭；空 meta=待官宣）
EVENTS_BTN_MAP = {"点此报名": "OPEN"}


def collect_zuicool_events(max_pages: int = 40) -> list[dict]:
    """最酷「赛事大全」列表（含未开报名/已截止的全部未来赛事），翻页抓取直到历史区。
    列表按比赛日期大致降序，历史赛事深不见底——策略：只保留今天及以后开赛的卡片，
    连续两整页全部过期即停止翻页（排序非严格单调，不能见旧即停）。"""
    leads: list[dict] = []
    today = time.strftime("%Y.%m.%d")
    stale_pages = 0
    for page in range(1, max_pages + 1):
        html = fetch(f"https://zuicool.com/events?page={page}&per-page=100")
        if not html:
            break
        soup = BeautifulSoup(html, "lxml")
        cards = soup.select("div.event")
        if not cards:
            break
        kept = 0
        for c in cards:
            a = c.select_one("h4.name a.event-a")
            info_el = c.select_one(".info")
            if not a or not info_el:
                continue
            name = a.get_text(strip=True)
            info = " ".join(info_el.get_text(" ", strip=True).split())
            dm = re.match(r"(\d{4}\.\d{2}\.\d{2})", info)
            race_date = dm.group(1) if dm else ""
            # 只收今天及以后开赛的赛事；日期缺失的保留（状态待核实）
            if race_date and race_date < today:
                continue
            kept += 1
            meta = c.select_one(".meta")
            meta_text = " ".join(meta.get_text(" ", strip=True).split()) if meta else ""
            btn = c.select_one("a.status_bth")
            btn_text = btn.get_text(strip=True) if btn else ""
            if btn_text in EVENTS_BTN_MAP:
                status = EVENTS_BTN_MAP[btn_text]
            elif "已截止" in meta_text or "已结束" in meta_text:
                status = "CLOSED"
            else:
                status = "UPCOMING"  # 无按钮且无截止标记：尚未开启报名
            deadline_text = ""
            dmatch = re.search(r"报名截止：([\d\-]+ ?[\d:]{0,5})", meta_text)
            if dmatch:
                deadline_text = f"报名截止：{dmatch.group(1).strip()}"
            leads.append({
                "name": name,
                "status": status,
                "status_label": btn_text or ("已截止" if "已截止" in meta_text else "未开始"),
                "date_text": info,  # 形如「2026.12.12 · 海南 琼海市」
                "venue": info,       # 全文作地点原文（含省市区地标）
                "city": infer_city_from_venue(info),
                "category": sport_category(name),
                "deadline_text": deadline_text,
                "registerGuide": f"最酷赛事大全：{a.get('href', '')}",
                "source": "zuicool_events",
                "url": a.get("href", ""),
            })
        stale_pages = stale_pages + 1 if kept == 0 else 0
        total_kept = len(leads)
        log(f"  [zuicool 大全] 第 {page} 页：{len(cards)} 卡片，保留未来赛事 {kept}（累计 {total_kept}）")
        if stale_pages >= 2:
            log(f"  [zuicool 大全] 连续两整页均为历史赛事，停止翻页")
            break
        time.sleep(REQUEST_INTERVAL)
    return leads


def save_nationwide_events(leads: list[dict]) -> tuple[int, int]:
    """全国赛事直接入库 Event（城市+赛事名幂等），返回 (新增, 更新)。
    入库口径：isPublished、verifyStatus=UNVERIFIED（平台状态可信但需人工抽查）。"""
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        existing_keys = {
            (r[0], normalize_name(r[1])) for r in cur.execute("SELECT city, name FROM Event")
        }
        inserted = updated = 0
        for e in leads:
            # 日期解析：赛事大全源用点分格式；截止优先用独立 deadline_text（如「报名截止：11-06 12:00」）
            race = parse_race_date_dot(e["date_text"])
            deadline_text = e.get("deadline_text", "")
            deadline = (
                parse_deadline_md_cn(deadline_text, race)
                if deadline_text
                else parse_deadline_cn(e["date_text"])
            )
            key = (e["city"], normalize_name(e["name"]))
            if key in existing_keys:
                # 官方报名直链（最酷等）优先保留；日历聚合站（黑练）的间接链接视为低优先级，
                # 可被后续采集到的官方直链覆盖
                cur.execute(
                    "UPDATE Event SET name=?, category=?, raceDateText=?, raceDateStart=?, raceDateEnd=?,"
                    " venue=?, status=?, deadlineText=?, deadlineAt=?,"
                    " registerGuide=CASE WHEN registerUrl!='' AND registerUrl NOT LIKE '%heilianapp.com%'"
                    "  THEN registerGuide ELSE ? END,"
                    " registerUrl=CASE WHEN registerUrl!='' AND registerUrl NOT LIKE '%heilianapp.com%'"
                    "  THEN registerUrl ELSE ? END,"
                    " updatedAt=datetime('now')"
                    " WHERE city=? AND name=?",
                    (e["name"], e["category"], e["date_text"] or "时间待定", race, race,
                     e["venue"], e["status"], deadline_text, deadline, e["registerGuide"], e["url"],
                     e["city"], e["name"]),
                )
                updated += 1
            else:
                cur.execute(
                    "INSERT INTO Event (id, name, city, province, category, tags, raceDateText, raceDateStart,"
                    " raceDateEnd, venue, status, deadlineText, deadlineAt, registerGuide, registerUrl,"
                    " verifyStatus, verifiedAt, kind, dataOrigin, sourceName, sourceSheet, isPublished,"
                    " createdAt, updatedAt)"
                    " VALUES (?, ?, ?, '', ?, '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNVERIFIED', NULL,"
                    " 'PARTICIPATABLE', 'MANUAL_COLLECTION', ?, ?, 1, datetime('now'), datetime('now'))",
                    (
                        uuid.uuid4().hex, e["name"], e["city"], e["category"],
                        e["date_text"] or "时间待定", race, race,
                        e["venue"], e["status"], deadline_text, deadline, e["registerGuide"], e["url"],
                        e["source"], e.get("sourceSheet", NATIONWIDE_SHEET),
                    ),
                )
                inserted += 1
                existing_keys.add(key)
        conn.commit()
        return inserted, updated
    finally:
        conn.close()

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
    parser.add_argument("--source", default="zuicool", help="数据源：zuicool / sogou / rss / nationwide / events / heilian / all（默认 zuicool）")
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

    if "nationwide" in sources:
        log("\n[全国模式] 抓取最酷全国列表并直接入库…")
        events = collect_zuicool_nationwide()
        ins, upd = save_nationwide_events(events)
        log(f"[全国模式] 入库完成：新增赛事 {ins}，更新 {upd}")
        print("\n全国赛事已入库（isPublished，待人工抽查），前台刷新即可见。")

    if "events" in sources:
        log("\n[赛事大全] 翻页抓取最酷赛事大全（含未开报名的未来赛事）并直接入库…")
        events = collect_zuicool_events()
        ins, upd = save_nationwide_events(events)
        log(f"[赛事大全] 入库完成：新增赛事 {ins}，更新 {upd}")
        print("\n赛事大全已入库（isPublished），前台刷新即可见。")

    if "heilian" in sources:
        log("\n[黑练] 抓取黑练四品类赛事日历并直接入库…")
        events = collect_heilian()
        ins, upd = save_nationwide_events(events)
        log(f"[黑练] 入库完成：新增赛事 {ins}，更新 {upd}")
        print("\n黑练日历已入库（isPublished），前台刷新即可见。")

    log("请到后台 /admin/submissions 核对「采集线索」，确认后正式录入赛事。")
    sys.exit(0)


if __name__ == "__main__":
    main()
