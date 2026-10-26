import { Discovery, type GapItem } from '@/components/Discovery';
import type { EventCardData } from '@/components/EventCard';
import { getPublishedEvents } from '@/lib/events';
import { prisma } from '@/lib/prisma';

// 数据运营频繁更新，禁用静态缓存，保证每次请求取最新赛事状态
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [events, gaps] = await Promise.all([
    getPublishedEvents(),
    prisma.gapReason.findMany(),
  ]);

  // 序列化为客户端组件可用的精简结构（Date → ISO 字符串）
  const cardData: EventCardData[] = events.map((e) => ({
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
  }));

  const gapData: GapItem[] = gaps.map((g) => ({
    city: g.city,
    category: g.category,
    reason: g.reason,
    seasonNote: g.seasonNote,
  }));

  // 顶部统计（Hero 副文案与统计条共用）
  const openCount = events.filter((e) =>
    ['OPEN', 'FIRST_COME'].includes(e.status) && e.kind === 'PARTICIPATABLE',
  ).length;
  const cityCount = new Set(events.map((e) => e.city)).size;

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-gray-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            找一场你能参加的比赛 🏃
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
            我们把全国大众可报名的运动赛事聚到一处，按城市和运动品类筛选，
            报名开启与截止前邮件提醒你，不再错过报名窗口。
            数据每日自动采集并核验，失效赛事自动下架。
          </p>
          {/* 信任补丁（P1）：个人站必须第一时间讲清「不经手报名与费用」 */}
          <p className="mt-2 max-w-2xl text-sm font-medium text-gray-700">
            报名与支付均在官方渠道完成，本站不经手任何费用。
          </p>
          <div className="mt-4 flex gap-5 text-sm font-semibold text-brand-700">
            <span>{cityCount} 个城市</span>
            <span>{events.length} 场赛事收录</span>
            <span>{openCount} 场正在报名</span>
          </div>
        </div>
      </section>

      {/* 发现页 */}
      <section className="mx-auto max-w-5xl px-4 py-8">
        <Discovery events={cardData} gaps={gapData} />
      </section>
    </div>
  );
}
