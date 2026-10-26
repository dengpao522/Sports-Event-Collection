/**
 * 城市落地页（SEO）：/city/上海、/city/北京 …
 * 服务端渲染该城市全部已发布赛事，附 ItemList JSON-LD；
 * 库中无该城市赛事时 404（防止任意城市参数生成空页被搜索引擎降权）。
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedEvents } from '@/lib/events';
import { EventCard, type EventCardData } from '@/components/EventCard';
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

/**
 * Next 16 动态路由 params 传入的是 percent-encoded 原始值（如 %E5%8C%97%E4%BA%AC），
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
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: raw } = await params;
  const city = decodeParam(raw);
  const events = (await getPublishedEvents()).filter((e) => e.city === city);
  if (events.length === 0) return { title: '页面不存在' };

  const openCount = events.filter(
    (e) => e.kind === 'PARTICIPATABLE' && ['OPEN', 'FIRST_COME'].includes(e.status)
  ).length;
  const title = `${city}运动赛事报名，${openCount} 场正在报名`;
  const description = `收录 ${city} 最新可报名运动赛事 ${events.length} 场：马拉松、球类、户外、骑行、水上等全部品类，报名开启与截止前邮件提醒，报名直链官方渠道。`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/city/${encodeURIComponent(city)}` },
  };
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: raw } = await params;
  const city = decodeParam(raw);
  const events = (await getPublishedEvents()).filter((e) => e.city === city);
  if (events.length === 0) notFound();

  const openCount = events.filter(
    (e) => e.kind === 'PARTICIPATABLE' && ['OPEN', 'FIRST_COME'].includes(e.status)
  ).length;
  const categories = [...new Set(events.map((e) => e.category))];

  // ItemList JSON-LD：帮助搜索引擎理解页面为赛事列表
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${city}运动赛事`,
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
          全民运动
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-gray-600">{city}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-extrabold text-gray-900">
        {city}运动赛事报名
      </h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        共收录 {city} 赛事 {events.length} 场，其中 {openCount} 场正在报名，覆盖{' '}
        {categories.join('、')} 等品类。报名与支付均在官方渠道完成，本站不经手任何费用。
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => (
          <EventCard key={e.id} ev={toCardData(e)} />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-gray-400">
        想第一时间收到 {city} 新赛事提醒？回首页按城市订阅即可（{SITE_NAME}，报名开启/截止前邮件通知）。
      </p>
    </div>
  );
}
