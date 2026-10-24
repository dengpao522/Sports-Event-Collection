# 全民运动 · Web 站点

大众运动赛事聚合站（MVP）。聚合上海、杭州大众可报名的运动赛事，支持按城市/品类/状态筛选、
搜索、赛事详情与官方报名指引、免注册邮箱提醒（报名开启/截止）、品类空窗订阅、用户投稿与报错。

产品背景与完整需求见仓库 `docs/PRD-平民运动赛事搜集网站.html`。

## 技术栈

- Next.js 16（App Router、React 19、TypeScript、Turbopack）
- Tailwind CSS v4
- Prisma 6 + SQLite（本地开发，后续可平滑切换 PostgreSQL）
- 邮件：开发期 mock（仅服务端控制台输出），正式期接入 Resend/SMTP（见 `src/lib/mailer.ts`）

## 本地启动

```powershell
# 1. 安装依赖
npm install

# 2. 准备环境变量
copy .env.example .env

# 3. 建库（生成 SQLite 表结构到 prisma/dev.db）
npm run db:push

# 4. 从仓库根目录「赛事清单」导入沪杭两份 Excel（幂等，可重复执行）
npm run import

# 5. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发服务器（Turbopack） |
| `npm run build` | 生产构建 |
| `npm run lint` | ESLint 检查 |
| `npm run db:push` | 按 `prisma/schema.prisma` 同步本地数据库 |
| `npm run db:studio` | 打开 Prisma Studio 查看/编辑数据 |
| `npm run import` | 从上级目录 `../赛事清单/*.xlsx` 导入赛事与品类空窗说明 |

## 目录说明

```
src/
  app/                 路由：首页、赛事详情、投稿、隐私政策、订阅/投稿 API
  components/          展示与交互组件（发现页、赛事卡、时间线、订阅弹窗等）
  lib/                 数据访问、品类归类、中文日期解析、常量、邮件抽象
prisma/
  schema.prisma        数据模型（Event / Subscription / Submission / GapReason）
scripts/
  import-xlsx.ts       Excel 导入脚本（按表头模糊匹配，幂等 upsert）
```

## 数据口径

- 赛事状态：待官宣 / 即将报名 / 报名中 / 报满即止 / 已截止 / 进行中 / 已结束 / 延期取消 / 待核实，
  取值统一定义在 `src/lib/constants.ts`。
- 无法确认的时间、费用等一律保留“待核实”，不以推测值伪装事实。
- 报名与支付均在官方渠道完成，本站不经手任何费用。
