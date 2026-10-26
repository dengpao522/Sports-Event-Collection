/**
 * 品类落地页（SEO）：/category/跑步、/category/越野跑山 …
 * 品类 key 必须在 CATEGORIES 白名单内（否则 404，防止任意参数生成垃圾页）；
 * 白名单内暂无赛事时渲染订阅引导（有限集合，不构成低质页风险）。
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedEvents } from '@/lib/events';
import { EventCard, type EventCardData } from '@/components/EventCard';
import { CATEGORIES } from '@/lib/constants';
import { SITE_URL, SITE_NAME } from '@/lib/site';

export const dynamic = 'force-dynamic';

/** 把库内赛事映射为卡片结构（Date → ISO 字符串） */
function toCardData(e: Awaited<ReturnType<typeof getPublishedEvents>>[number]): EventCardData {
  return {
    id: e.id,
    name: e.name,
    city: e.city,
    category: e.category,
    tags: JSON.parse(e.tags) as string[],
    status: e.status,
    kind: e.kind,
    verifyStatus: e.verifyStatus,
    raceDateText: e.raceDateText,
    raceDateStart: e.raceDateStart ? e.raceDateStart.toISOString() : null,
    venue: e.venue,
    deadlineText: e.deadlineText,
  };
}

function findCategory(key: string) {
  return CATEGORIES.find((c) => c.key === key);
}

/**
 * Next 16 动态路由 params 传入的是 percent-encoded 原始值（如 %E8%B7%91%E6%AD%A5），
 * 需手动解码；畸形编码（含孤立 %）时捕获 URIError 原样返回。
 */
function decodeParam(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const key = decodeParam(category);
  const cat = findCategory(key);
  if (!cat) return { title: '页面不存在' };

  const events = (await getPublishedEvents()).filter((e) => e.category === key);
  const openCount = events.filter(
    (e) => e.kind === 'PARTICIPATABLE' && ['OPEN', 'FIRST_COME'].includes(e.status)
  ).length;
  const title = `${cat.label}赛事报名，全国 ${events.length} 场`;
  const description = `全国 ${cat.label}赛事一览：${events.length} 场赛事、${openCount} 场正在报名，覆盖全国各城市，报名开启与截止前邮件提醒，报名直链官方渠道。`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/category/${encodeURIComponent(key)}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const key = decodeParam(category);
  const cat = findCategory(key);
  if (!cat) notFound();

  const events = (await getPublishedEvents()).filter((e) => e.category === key);
  const openCount = events.filter(
    (e) => e.kind === 'PARTICIPATABLE' && ['OPEN', 'FIRST_COME'].includes(e.status)
  ).length;
  const cities = [...new Set(events.map((e) => e.city))];

  // ItemList JSON-LD：帮助搜索引擎理解页面为赛事列表
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `全国${cat.label}赛事`,
    numberOfItems: events.length,
    itemListElement: events.slice(0, 50).map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SportsEvent',
        name: e.name,
        url: `${SITE_URL}/events/${e.id}`,
        ...(e.raceDateStart ? { startDate: e.raceDateStart.toISOString() } : {}),
        location: {
          '@type': 'Place',
          name: e.venue || e.city,
          address: { '@type': 'PostalAddress', addressLocality: e.city, addressCountry: 'CN' },
        },
      },
    })),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-sm text-gray-400">
        <Link href="/" className="hover:text-brand-600">
          {SITE_NAME}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-gray-600">{cat.label}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-extrabold text-gray-900">全国{cat.label}赛事报名</h1>
      {events.length > 0 ? (
        <p className="mt-2 text-sm leading-6 text-gray-600">
          共收录 {events.length} 场，其中 {openCount} 场正在报名，覆盖 {cities.slice(0, 12).join('、')}
          {cities.length > 12 ? ' 等' : ''} {cities.length} 座城市。报名与支付均在官方渠道完成，本站不经手任何费用。
        </p>
      ) : (
        <p className="mt-2 text-sm leading-6 text-gray-600">
          暂无已收录的{cat.label}赛事。数据每日自动更新，回首页按「{cat.label} × 城市」订阅，
          新赛事上架即邮件提醒你。
        </p>
      )}

      {events.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.id} ev={toCardData(e)} />
          ))}
        </div>
      )}
    </div>
  );
}
