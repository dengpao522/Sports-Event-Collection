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
import base64
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


def decode_bing_redirect(href: str) -> str:
    """必应结果链接是 /ck/a?u=a1<base64> 跳转形式，解出真实 URL"""
    if "bing.com/ck/a" not in href:
        return href
    m = re.search(r"[?&]u=a1([^&]+)", href)
    if not m:
        return href
    raw = m.group(1)
    try:
        return base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4)).decode("utf-8", "ignore")
    except Exception:
        return href


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
SOGOU_KEYWORDS = ["马拉松 报名", "赛事 报名"]


def new_sogou_session() -> requests.Session:
    """建立搜狗会话：预热拿 ABTEST/SUID cookie，可显著降低验证码概率（实测 3 城连续零拦截）"""
    s = requests.Session()
    s.headers.update({**HEADERS, "Referer": "https://weixin.sogou.com/"})
    try:
        s.get("https://weixin.sogou.com/", timeout=20)
    except Exception as e:
        log(f"    [sogou] 预热失败: {type(e).__name__}")
    return s


def collect_sogou_weixin(cities: list[str]) -> list[dict]:
    """搜狗微信文章搜索：公众号是赛事推文的发布主场，此源直接覆盖"""
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
            # 页面结构：div.news-box > ul.news-list > li（每 li 一篇，标题链接 id 以 sogou_vr_ 开头）
            for li in soup.select("ul.news-list > li"):
                a = li.select_one('a[id^="sogou_vr"]') or li.select_one("h3 a")
                if not a:
                    continue
                title = a.get_text(strip=True)
                href = a.get("href", "")
                if href.startswith("/link"):
                    href = f"https://weixin.sogou.com{href}"
                # 摘要与日期/来源行
                snippet = li.select_one(".txt-info")
                date_el = li.select_one(".s2") or li.select_one("p.news-from")
                snippet_text = snippet.get_text(strip=True)[:200] if snippet else ""
                date_text = date_el.get_text(" ", strip=True) if date_el else ""
                leads.append({
                    "source": "sogou_weixin",
                    "city": city if city in title else "",
                    "name": title,
                    "status_label": "公众号推文",
                    "date_text": date_text[:80],
                    "venue": snippet_text,
                    "url": href,
                })
                count += 1
            log(f"  [sogou] {city}（{kw}）: {count} 条")
            time.sleep(REQUEST_INTERVAL * 2)
    return leads


# ---------- 数据源 3：必应普通关键词搜索（best-effort 补充） ----------

def collect_bing_xhs(cities: list[str]) -> list[dict]:
    """必应普通关键词搜索（如「南京 越野赛 报名」），解码跳转链接后收集非主流站线索。
    实测其中国区自然结果以官网/主流站为主，小红书/公众号直链命中有限，仅作 best-effort 补充。"""
    leads: list[dict] = []
    for city in cities:
        url = f"https://www.bing.com/search?q={city}+%E8%B6%8A%E9%87%8E%E8%B5%9B+%E6%8A%A5%E5%90%8D&setmkt=zh-CN"
        html = fetch(url)
        if not html or "验证" in html[:2000]:
            log(f"  [bing] {city}: 被风控或无结果")
            time.sleep(REQUEST_INTERVAL * 2)
            continue
        soup = BeautifulSoup(html, "lxml")
        count = 0
        for li in soup.select("li.b_algo")[:10]:
            a = li.select_one("h2 a")
            if not a:
                continue
            title = a.get_text(strip=True)
            href = decode_bing_redirect(a.get("href", ""))
            snippet = li.select_one(".b_caption p")
            leads.append({
                "source": "bing",
                "city": city if city in title else "",
                "name": title,
                "status_label": "待核实",
                "date_text": "",
                "venue": snippet.get_text(strip=True)[:150] if snippet else "",
                "url": href,
            })
            count += 1
        log(f"  [bing] {city}: {count} 条")
        time.sleep(REQUEST_INTERVAL * 2)
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
                lines.append(f"地点：{lead['venue']}")
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
    parser.add_argument("--source", default="zuicool", help="数据源：zuicool / bing / sogou / all（默认 zuicool）")
    args = parser.parse_args()

    cities = [args.city] if args.city else CITIES
    sources = args.source.split(",")

    log(f"开始采集：{len(cities)} 城 × 数据源 [{args.source}]")
    leads: list[dict] = []
    if "zuicool" in sources:
        leads += collect_zuicool(cities)
    if "bing" in sources:
        leads += collect_bing_xhs(cities)
    if "sogou" in sources:
        leads += collect_sogou_weixin(cities)

    log(f"\n共抓取线索 {len(leads)} 条，开始去重入库…")
    existing_names, existing_urls = load_existing()
    inserted, dup_event, dup_lead = save_leads(leads, existing_names, existing_urls)
    log(f"完成：新增线索 {inserted} 条（与库内赛事重复跳过 {dup_event}，重复线索跳过 {dup_lead}）")
    log("请到后台 /admin/submissions 核对「采集线索」，确认后正式录入赛事。")
    sys.exit(0)


if __name__ == "__main__":
    main()
