# 赛事线索采集器（crawler/）

自动化"发现赛事线索"，替代人工刷小红书/公众号。抓到的新线索写入网站投稿表，
到后台 `/admin/submissions` 核对「采集线索」（紫色徽章）后正式录入赛事。

## 运行

```powershell
# 全量：25 城 × 全部数据源（最酷约 40 秒，搜狗约 2 分钟）
python crawler/collect.py --source zuicool,sogou

# 单城市 / 指定数据源
python crawler/collect.py --city 南京 --source zuicool,sogou,bing
```

## 数据源

| source | 覆盖目标 | 说明 | 状态 |
| --- | --- | --- | --- |
| `zuicool` | 路跑/越野报名中赛事 | 最酷报名平台各城市页，结构化最好 | **稳定（主力）** |
| `sogou` | 公众号推文 | 搜狗微信文章搜索，Session 预热（ABTEST/SUID）后低频连续请求实测稳定；每城查询「马拉松 报名」「赛事 报名」两组关键词 | **稳定（公众号主力）** |
| `bing` | 泛搜索补充 | 必应普通关键词搜索 + 跳转链接解码。实测其中国区自然结果几乎不含小红书/公众号直链，产出有限 | best-effort |

## 关于小红书与公众号的边界（实测结论）

- **公众号**：搜狗微信搜索可稳定覆盖（文章本身是公开网页）；发现文章后的正文直抓可行
- **小红书**：必应/百度对无浏览器指纹的请求会弱化 `site:` 语法与小红书结果（实测 site:/RSS/预热 Cookie 三种方式均被弱化），无头脚本没有可靠通道。小红书内容的推荐流程：手机刷到 → 复制链接/文字 → `/submit` 投稿页录入；长期靠用户投稿沉淀
- 不采用 MediaCrawler 类登录逆向爬虫（封号风险 + 违规）

## 去重机制

- 与库内 `Event.name` 归一化比对 → 已收录赛事不再重复报
- 与已有线索的来源 URL 比对 → 同一线索只报一次
- 因此**重复运行安全**，每次只产出增量新发现

## 定时

Windows 任务计划每天 1 次：

```
程序：python
参数：D:\Sports Event Data Collection Project\crawler\collect.py --source zuicool,sogou
起始位置：D:\Sports Event Data Collection Project
```

## 后台核对流程

1. `/admin/submissions` 查看「采集线索」（紫色徽章，含时间/地点/平台状态/来源链接）
2. 点 contact 链接核对原文 → 无误则到「赛事管理 → 新建赛事」正式录入
3. 线索本身点「通过」归档（表示已处理）
