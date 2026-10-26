import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL), // canonical / OG 相对链接的解析基准
  title: {
    default: '全民运动 · 找一场你能参加的比赛',
    template: '%s · 全民运动',
  },
  description:
    '聚合全国大众可报名的运动赛事：马拉松、越野、球类、户外、骑行、水上等 20+ 品类，按城市和品类查找比赛，报名开启与截止前邮件提醒，报名直链官方渠道。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
