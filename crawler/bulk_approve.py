# -*- coding: utf-8 -*-
"""
一键通过：把自动核对判定为高置信（AUTO_PASS）且仍待审（PENDING）的采集线索
批量置为已通过（APPROVED）——与后台「一键通过」按钮同等效果，命令行直连库执行。
用法：python crawler/bulk_approve.py
"""
import sqlite3

con = sqlite3.connect(r"web\prisma\dev.db")
cur = con.cursor()
n = cur.execute(
    "UPDATE Submission SET status='APPROVED', reviewedAt=datetime('now')"
    " WHERE autoStatus='AUTO_PASS' AND status='PENDING'"
).rowcount
con.commit()
print(f"一键通过：{n} 条高置信线索已置为 APPROVED")
rest = cur.execute("select status, count(*) from Submission group by status").fetchall()
print("线索队列剩余分布:", rest)
con.close()
