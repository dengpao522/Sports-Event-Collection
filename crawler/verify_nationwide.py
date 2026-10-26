# -*- coding: utf-8 -*-
"""
全国赛事自我核验脚本：全量回访详情页，自动审核入库的全国赛事（三个采集源）。

覆盖源：
  - zuicool_nationwide（reg.zuicool.com/<raceId>，span.label 状态标签）
  - zuicool_events（zuicool.com/event/<id>，页面状态文案）
  - heilianapp（heilianapp.com/events/<id>，页面状态文案）

核验维度（每条赛事）：
  1. 可达性   —— 详情页 HTTP 200 且能解析；
  2. 标题一致 —— 页面标题/文本中能找到赛事名（容忍年份前缀差异）；
  3. 状态一致 —— 详情页报名状态与库内 status 比对，以详情页实时状态为准修正。

结果处理（自动落地，无需人工逐条核对）：
  - 页面失效 / 标题不符        → isPublished=0 自动下架，verifyStatus=AUTO_REJECTED；
  - 状态标签与库内不一致       → 以详情页为准更新 status，verifyStatus=AUTO_VERIFIED；
  - 全部一致                   → verifyStatus=AUTO_VERIFIED，verifiedAt=当前时间；
  - 页面正常但无状态标签       → 保持上线，verifyStatus 维持 UNVERIFIED（仅计数，留人工抽查）。

用法：
  python crawler/verify_nationwide.py                 # 全量核验
  python crawler/verify_nationwide.py --limit 20     # 抽样核验前 20 条
  python crawler/verify_nationwide.py --interval 0.5 # 自定义请求间隔（秒）
"""
import argparse
import io
import re
import sqlite3
import sys
import time
from datetime import datetime, timezone

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from bs4 import BeautifulSoup

from collect import DB_PATH, HEADERS

import requests

# 核验结论常量（写入 Event.verifyStatus）
VERIFIED = "AUTO_VERIFIED"    # 详情页可达且状态一致（或已按详情页修正）
REJECTED = "AUTO_REJECTED"    # 页面失效/标题不符，自动下架

# 自我核验覆盖的三个采集源
NATIONWIDE_SOURCES = ("zuicool_nationwide", "zuicool_events", "heilianapp")

# 页面状态文案 → 库内状态。
# 顺序关键：负向状态（已截止/已结束）优先——开放报名的页面不会出现这些词，
# 而正向词只收具体徽章文案，不含「一键报名/点此报名」这类全站按钮泛词（否则 CLOSED 会被误判 OPEN）。
STATUS_PATTERNS = [
    (re.compile(r"已截止|报名结束|已关闭"), "CLOSED"),
    (re.compile(r"已结束"), "FINISHED"),
    (re.compile(r"正在报名|火热报名中|报名即将结束"), "OPEN"),
]

# reg.zuicool.com 状态标签文本 → 库内状态
REG_STATUS_MAP = {"报名中": "OPEN", "已截止": "CLOSED", "已结束": "FINISHED", "已关闭": "CLOSED"}


def page_status_of(url: str, soup: BeautifulSoup, text: str) -> str:
    """按详情页域名/结构提取报名状态，返回库内状态枚举或空串"""
    if url.startswith("https://reg.zuicool.com"):
        label = soup.select_one("span.label")
        return REG_STATUS_MAP.get(label.get_text(strip=True), "") if label else ""
    for pat, status in STATUS_PATTERNS:
        if pat.search(text):
            return status
    return ""


def probe_detail(url: str) -> dict | None:
    """抓取单个详情页，返回 {page_status, title_ok, name}；页面不可达返回 None。"""
    try:
        r = requests.get(url, headers=HEADERS, timeout=25)
        if r.status_code != 200:
            return None
        r.encoding = r.apparent_encoding or "utf-8"
    except Exception:
        return None
    soup = BeautifulSoup(r.text, "lxml")
    text = soup.get_text(" ", strip=True)
    title = soup.title.get_text(strip=True) if soup.title else ""
    return {"text": text, "title": title, "page_status": page_status_of(url, soup, text)}


def verify_nationwide(limit: int | None = None, interval: float = 0.8) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        placeholders = ",".join("?" for _ in NATIONWIDE_SOURCES)
        sql = (
            f"SELECT id, name, status, registerUrl FROM Event"
            f" WHERE sourceName IN ({placeholders}) AND isPublished=1"
            f" ORDER BY name"
        )
        rows = cur.execute(sql, NATIONWIDE_SOURCES).fetchall()
        if limit:
            rows = rows[:limit]
        total = len(rows)
        print(f"[自我核验] 待核验 {total} 条全国赛事…")

        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        stat = {"pass": 0, "fixed": 0, "rejected": 0, "need_human": 0}
        for i, (eid, name, db_status, url) in enumerate(rows, 1):
            detail = probe_detail(url) if url else None
            if detail is None:
                # 页面失效：自动下架，不再前台展示
                cur.execute(
                    "UPDATE Event SET isPublished=0, verifyStatus=?, verifiedAt=?,"
                    " updatedAt=datetime('now') WHERE id=?",
                    (REJECTED, now, eid),
                )
                stat["rejected"] += 1
                print(f"  [{i}/{total}] ⛔ 下架（页面失效）: {name}")
                conn.commit()
                time.sleep(interval)
                continue
            # 标题一致：页面标题或文本含赛事名（容忍年份差异——去掉年份再兜底匹配）
            core = name.replace("2026", "").replace("2027", "").strip()
            title_ok = name in detail["text"] or name in detail["title"] or (
                len(core) >= 4 and core in detail["text"]
            )
            if not title_ok:
                cur.execute(
                    "UPDATE Event SET isPublished=0, verifyStatus=?, verifiedAt=?,"
                    " updatedAt=datetime('now') WHERE id=?",
                    (REJECTED, now, eid),
                )
                stat["rejected"] += 1
                print(f"  [{i}/{total}] ⛔ 下架（标题不符）: {name}")
            elif detail["page_status"] and detail["page_status"] != db_status:
                # 状态不一致：以详情页实时状态为准修正
                cur.execute(
                    "UPDATE Event SET status=?, verifyStatus=?, verifiedAt=?,"
                    " updatedAt=datetime('now') WHERE id=?",
                    (detail["page_status"], VERIFIED, now, eid),
                )
                stat["fixed"] += 1
                print(f"  [{i}/{total}] 🔧 状态修正 {db_status}→{detail['page_status']}: {name}")
            elif detail["page_status"]:
                cur.execute(
                    "UPDATE Event SET verifyStatus=?, verifiedAt=?,"
                    " updatedAt=datetime('now') WHERE id=?",
                    (VERIFIED, now, eid),
                )
                stat["pass"] += 1
            else:
                # 页面正常但未识别到状态：保持上线，留给人工抽查
                cur.execute(
                    "UPDATE Event SET verifyStatus='UNVERIFIED', verifiedAt=NULL,"
                    " updatedAt=datetime('now') WHERE id=?",
                    (eid,),
                )
                stat["need_human"] += 1
            conn.commit()
            time.sleep(interval)

        print(
            f"\n[自我核验] 完成：通过 {stat['pass']}，状态修正 {stat['fixed']}，"
            f"自动下架 {stat['rejected']}，待人工 {stat['need_human']}"
        )
    finally:
        conn.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="全国赛事自我核验")
    ap.add_argument("--limit", type=int, default=None, help="仅核验前 N 条（抽样）")
    ap.add_argument("--interval", type=float, default=0.8, help="请求间隔秒数")
    args = ap.parse_args()
    verify_nationwide(limit=args.limit, interval=args.interval)
