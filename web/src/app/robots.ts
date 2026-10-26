/**
 * robots.txt（Next 约定文件）：/robots.txt
 * 全站允许抓取，仅管理后台（登录墙内）禁止收录；声明 sitemap 位置。
 */
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
