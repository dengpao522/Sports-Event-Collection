# 上线部署指南（域名 → 备案 → 服务器 → 部署）

> 目标：让「全民运动」通过你自己的域名，向所有人生效可访问。
> 技术栈是 Next.js + SQLite（本地文件库），**推荐部署在一台国内轻量云服务器上**，
> 而不是 Vercel 等 serverless 平台——原因见「为什么不用 Vercel」。

## 一、为什么不用 Vercel（重要，先读）

| 对比项 | 国内轻量服务器（推荐） | Vercel 免费档 |
| --- | --- | --- |
| 国内访问速度 | 快（服务器在国内） | 慢且不稳定 |
| ICP 备案 | 需要（流程见下） | 不适用（无法绑定备案） |
| SQLite 文件库 | 直接可用（持久磁盘） | 不可用（无持久磁盘，数据会丢） |
| 费用 | 轻量服务器约 ¥50–100/月 | 免费 |

个人站流量下 SQLite 完全够用，**选国内轻量服务器是成本与体验的最优解**。

## 二、上线三件套步骤

### 1. 买域名（约 ¥30–80/年）

- 阿里云 / 腾讯云均可，`.com` / `.cn` / `.top` 等任选
- 实名认证通过后才能备案

### 2. ICP 备案（免费，约 1–3 周，个人站可行）

- 在云服务器厂商的备案系统提交：身份证 + 手机号 + 域名 + 服务器信息
- 网站性质选「个人」，网站名称避免商业词汇（如就叫「全民运动」可能需要说明，可备「XX的运动笔记」之类更稳妥的名称）
- 期间域名不可访问，服务器需先购买（备案要求有服务器）
- 备注：个人备案不允许有「经营性」内容；本站无支付、无收费，属纯信息展示，符合个人备案范围

### 3. 买服务器并部署（推荐配置）

- 腾讯云/阿里云**轻量应用服务器**：2核2G 即可，系统选 Ubuntu 22.04
- 备案通过后，域名解析添加一条 A 记录指向服务器公网 IP

### 4. 服务器上部署（命令均可直接粘贴）

```bash
# 1) 装 Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 2) 拉代码
git clone https://github.com/dengpao522/Sports-Event-Collection.git
cd Sports-Event-Collection/web

# 3) 配置生产环境变量（模板见下方「生产环境变量清单」）
cp .env.example .env
nano .env   # 逐项修改，务必改 ADMIN_PASSWORD 与 NEXT_PUBLIC_SITE_URL

# 4) 构建并启动（pm2 守护，开机自启）
sudo npm i -g pm2
npm install
npx prisma db push      # 初始化数据库
npm run import          # 导入赛事清单
npm run build
pm2 start "npm start" --name quanmin
pm2 save && pm2 startup # 开机自启

# 5) Nginx 反向代理 + HTTPS（假设域名 quanmin.example.com）
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo tee /etc/nginx/sites-available/quanmin <<'EOF'
server {
    listen 80;
    server_name quanmin.example.com;   # 换成你的域名
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/quanmin /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload
sudo certbot --nginx -d quanmin.example.com   # 免费自动续期的 HTTPS 证书
```

## 三、生产环境变量清单（.env）

```ini
DATABASE_URL="file:./dev.db"          # 生产放 web 目录外更佳，如 file:/var/data/quanmin.db
MAIL_PROVIDER="resend"                # 上线后切真实发信
RESEND_API_KEY="re_xxx"               # resend.com 注册获取（见下）
MAIL_FROM="全民运动 <no-reply@你的域名>"  # Resend 需验证该域名
NEXT_PUBLIC_SITE_URL="https://quanmin.example.com"  # 换成正式域名（影响确认/退订链接）
ADMIN_PASSWORD="改成强密码"            # 后台登录，务必修改
NOTIFY_ENABLED="1"                    # 提醒定时任务保持开启
```

## 四、启用 Resend 真实邮件（10 分钟）

1. [resend.com](https://resend.com) 注册（免费档：每天 100 封 / 每月 3000 封，个人站足够）
2. Domains → Add Domain → 填你的域名，按提示到域名 DNS 里加 3 条记录（SPF/DKIM）验证
3. API Keys → 创建 Key，填入 `.env` 的 `RESEND_API_KEY`
4. `MAIL_PROVIDER` 改为 `resend`，`pm2 restart quanmin` 生效
5. 验证：前台订阅任意提醒 → 邮箱应收到确认邮件

> 未配置 Key 时即使 provider=resend 也会自动降级为控制台 mock，不会报错中断提醒任务。

## 五、日常运维

| 操作 | 命令 |
| --- | --- |
| 更新代码后重启 | `git pull && npm install && npm run build && pm2 restart quanmin` |
| 备份数据库 | `cp prisma/dev.db ~/backup/dev-$(date +%F).db`（建议加到 crontab 每日备份） |
| 看运行日志 | `pm2 logs quanmin` |
| 手动跑一轮提醒扫描 | `npm run notify` |
| 更新赛事数据 | 后台 `/admin/import` 上传 xlsx（无需登服务器） |

## 六、上线检查清单

- [ ] `.env` 的 `ADMIN_PASSWORD` 已改强密码
- [ ] `NEXT_PUBLIC_SITE_URL` 已改为正式域名（否则确认/退订链接仍是 localhost）
- [ ] Resend 域名验证通过，确认邮件可真实送达
- [ ] HTTPS 证书生效（certbot 自动续期）
- [ ] 数据库每日备份 crontab 已配置
- [ ] 后台 `/admin` 看板显示正常，覆盖度矩阵有数据
