# 赛事线索采集器（crawler/）

自动化"发现赛事线索"，替代人工刷小红书/公众号。抓到的新线索写入网站投稿表，
到后台 `/admin/submissions` 核对「采集线索」（紫色徽章）后正式录入赛事。

## 运行

```powershell
# 全量：25 城 × 最酷报名平台（约 40 秒）
python crawler/collect.py

# 单城市 + 多数据源
python crawler/collect.py --city 南京 --source zuicool,bing,sogou
```

## 数据源

| source | 说明 | 状态 |
| --- | --- | --- |
| `zuicool` | 最酷报名平台各城市页，路跑/越野主力源，结构化最好 | 稳定（主力） |
| `bing` | 必应 site:xiaohongshu.com 间接覆盖小红书内容 | 实验性（必应对无 Cookie 请求可能忽略 site: 语法，产出 0 属正常） |
| `sogou` | 搜狗微信文章搜索（城市+马拉松+报名），覆盖公众号推文 | 实验性（易触发验证码，触发后自动跳过，隔天再跑） |

## 去重机制

- 与库内 `Event.name` 归一化比对 → 已收录赛事不再重复报
- 与已有线索的来源 URL 比对 → 同一线索只报一次
- 因此**重复运行安全**，每次只产出增量新发现

## 定时

Windows 任务计划每天 1 次：

```
程序：python
参数：D:\Sports Event Data Collection Project\crawler\collect.py
起始位置：D:\Sports Event Data Collection Project
```

## 后台核对流程

1. `/admin/submissions` 查看「采集线索」（紫色徽章，含时间/地点/平台状态/来源链接）
2. 点 contact 链接核对原文 → 无误则到「赛事管理 → 新建赛事」正式录入
3. 线索本身点「通过」归档（表示已处理）

## 已知边界

- 必应/搜狗反爬波动会导致部分轮次产出为 0，属正常，重跑即可
- 球类/游泳等社群类赛事不在公网平台，仍靠用户投稿（/submit）补充
- 小红书直爬（MediaCrawler 类）有封号风险，本项目不采用，用搜索引擎间接覆盖
