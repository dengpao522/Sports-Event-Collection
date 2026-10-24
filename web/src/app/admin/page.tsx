import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { CATEGORIES, CITIES, REG_STATUS } from '@/lib/constants';
import { StatusBadge } from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

/** 覆盖度矩阵口径：已发布 + 可报名 + 尚未跑完/截止的状态（即“用户现在能期待报名”的库存） */
const MATRIX_WHERE: Prisma.EventWhereInput = {
  isPublished: true,
  kind: 'PARTICIPATABLE',
  status: { in: ['OPEN', 'FIRST_COME', 'UPCOMING', 'PENDING_ANNOUNCEMENT'] },
};

/** 运营看板：核心统计 + 城市×品类覆盖度矩阵 + 临近复核清单（FR-08） */
export default async function AdminDashboardPage() {
  await requireAdmin();
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 86400_000);
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [statusGroups, unpublishedCount, grid, pendingSubCount, confirmedSubCount, deadlineSoon, stale] =
    await Promise.all([
      prisma.event.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.event.count({ where: { isPublished: false } }),
      prisma.event.groupBy({
        by: ['city', 'category'],
        where: MATRIX_WHERE,
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
      prisma.submission.count({ where: { status: 'PENDING' } }),
      prisma.subscription.count({ where: { confirmed: true } }),
      // 复核一：7 天内截止的报名中赛事 → 提醒及时确认是否真的截止
      prisma.event.findMany({
        where: {
          isPublished: true,
          status: { in: ['OPEN', 'FIRST_COME'] },
          deadlineAt: { gte: now, lte: in7d },
        },
        orderBy: { deadlineAt: 'asc' },
        take: 10,
      }),
      // 复核二：比赛日期已过但状态仍在“可报名/即将报名” → 数据过期异常
      prisma.event.findMany({
        where: {
          isPublished: true,
          status: { in: ['OPEN', 'FIRST_COME', 'UPCOMING', 'PENDING_ANNOUNCEMENT'] },
          raceDateStart: { lt: todayStart },
        },
        orderBy: { raceDateStart: 'asc' },
        take: 10,
      }),
    ]);

  // 状态计数汇总
  const byStatus: Record<string, number> = {};
  for (const g of statusGroups) byStatus[g.status] = g._count._all;
  const total = statusGroups.reduce((s, g) => s + g._count._all, 0);
  const openCount = (byStatus.OPEN ?? 0) + (byStatus.FIRST_COME ?? 0);
  const soonCount = (byStatus.UPCOMING ?? 0) + (byStatus.PENDING_ANNOUNCEMENT ?? 0);
  const unverifiedCount = byStatus.UNVERIFIED ?? 0;

  // 覆盖度矩阵：key = 城市|品类
  const cellMap = new Map(grid.map((g) => [`${g.city}|${g.category}`, g]));

  const stats = [
    { label: '赛事总数', value: total, sub: `草稿 ${unpublishedCount}`, href: '/admin/events' },
    { label: '报名中', value: openCount, sub: '含报满即止', href: '/admin/events?status=OPEN' },
    { label: '即将/待官宣', value: soonCount, sub: '可订阅提醒库存', href: '/admin/events?status=PENDING_ANNOUNCEMENT' },
    { label: '待核实', value: unverifiedCount, sub: '需人工确认', href: '/admin/events?status=UNVERIFIED' },
    { label: '待审核投稿', value: pendingSubCount, sub: '先审后发', href: '/admin/submissions' },
    { label: '已确认订阅', value: confirmedSubCount, sub: '双重确认后', href: '/admin' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">运营看板</h1>
        <p className="mt-0.5 text-sm text-gray-500">数据覆盖度与待办一眼清。矩阵统计口径：已发布、可报名、未截止开跑的赛事。</p>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand-500"
          >
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-black text-gray-900">{s.value}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* 覆盖度矩阵：城市 × 一级品类 */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-900">品类覆盖度（城市 × 品类）</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-4">
          <table className="w-full min-w-[680px] text-center text-xs">
            <thead>
              <tr className="text-gray-500">
                <th className="px-2 py-1.5 text-left font-semibold">城市</th>
                {CATEGORIES.map((c) => (
                  <th key={c.key} className="px-2 py-1.5 font-semibold">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CITIES.map((city) => (
                <tr key={city}>
                  <td className="px-2 py-1.5 text-left font-bold text-gray-700">{city}</td>
                  {CATEGORIES.map((c) => {
                    const cell = cellMap.get(`${city}|${c.key}`);
                    const n = cell?._count._all ?? 0;
                    // 空格标红（覆盖缺口），1–2 场黄色，3 场及以上绿色
                    const cls =
                      n === 0
                        ? 'bg-red-50 text-red-400'
                        : n <= 2
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-green-50 text-green-700';
                    return (
                      <td key={c.key} className={`px-2 py-1.5 ${cls} rounded`}>
                        <span className="font-bold">{n}</span>
                        {cell?._max.updatedAt && (
                          <span className="ml-1 text-[10px] opacity-60">
                            {cell._max.updatedAt.toLocaleDateString('zh-CN', { timeZone: 'UTC' })}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 临近复核清单 */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">临近截止（7 天内）</h2>
          <p className="mt-0.5 mb-2 text-xs text-gray-400">建议逐一核实官方是否真已截止，截止后改状态为“已截止”。</p>
          <ul className="divide-y divide-gray-100">
            {deadlineSoon.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <Link href={`/admin/events/${ev.id}`} className="truncate font-semibold text-gray-800 hover:text-brand-600">
                  {ev.name}
                </Link>
                <span className="shrink-0 text-xs text-red-500">
                  {ev.deadlineAt?.toLocaleDateString('zh-CN', { timeZone: 'UTC' })} 截止
                </span>
              </li>
            ))}
            {deadlineSoon.length === 0 && <li className="py-4 text-center text-xs text-gray-400">暂无</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">状态异常（日期已过仍在报名）</h2>
          <p className="mt-0.5 mb-2 text-xs text-gray-400">比赛日期已过但状态仍是报名中/即将报名，需要人工修正。</p>
          <ul className="divide-y divide-gray-100">
            {stale.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <Link href={`/admin/events/${ev.id}`} className="truncate font-semibold text-gray-800 hover:text-brand-600">
                  {ev.name}
                </Link>
                <span className="flex shrink-0 items-center gap-2 text-xs text-gray-400">
                  {ev.raceDateStart?.toLocaleDateString('zh-CN', { timeZone: 'UTC' })}
                  <StatusBadge status={ev.status} />
                </span>
              </li>
            ))}
            {stale.length === 0 && <li className="py-4 text-center text-xs text-gray-400">暂无异常</li>}
          </ul>
        </div>
      </section>

      {/* 状态分布速览 */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold text-gray-900">状态分布</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(REG_STATUS).map(([key, meta]) => (
            <span
              key={key}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.badge}`}
            >
              {meta.label}
              <b className="text-sm">{byStatus[key] ?? 0}</b>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
