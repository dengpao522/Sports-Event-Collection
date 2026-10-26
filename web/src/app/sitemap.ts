/**
 * sitemap.xml（Next 约定文件）：/sitemap.xml
 * 动态生成：静态页 + 全部已发布赛事详情 + 非空城市/品类落地页。
 * 数据每日自动采集更新，sitemap 每次请求实时生成（force-dynamic）。
 */
import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/submit`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const events = await prisma.event.findMany({
      where: { isPublished: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    // 详情页：带 lastModified 帮助搜索引擎判断重新抓取
    for (const e of events) {
      entries.push({
        url: `${SITE_URL}/events/${e.id}`,
        lastModified: e.updatedAt,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }

    // 城市/品类落地页：只收录库中存在赛事的组合（与页面 404 逻辑一致）
    const cities = await prisma.event.findMany({
      where: { isPublished: true },
      distinct: ['city'],
      select: { city: true },
    });
    for (const { city } of cities) {
      entries.push({
        url: `${SITE_URL}/city/${encodeURIComponent(city)}`,
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }

    const categories = await prisma.event.findMany({
      where: { isPublished: true },
      distinct: ['category'],
      select: { category: true },
    });
    for (const { category } of categories) {
      entries.push({
        url: `${SITE_URL}/category/${encodeURIComponent(category)}`,
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
  } catch (e) {
    // 数据库不可用时至少返回静态页，避免 sitemap 整体 500
    console.error('[sitemap] 查询赛事失败，仅输出静态页:', e);
  }

  return entries;
}
