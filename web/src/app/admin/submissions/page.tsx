import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { SUBMISSION_TYPE, type SubmissionTypeKey } from '@/lib/constants';
import { reviewSubmissionAction } from '@/app/admin/actions';

export const dynamic = 'force-dynamic';

// 投稿类型徽章配色
const TYPE_BADGE: Record<string, string> = {
  EVENT_TIP: 'bg-brand-100 text-brand-700',
  CORRECTION: 'bg-red-100 text-red-700',
  FIND_REQUEST: 'bg-blue-100 text-blue-700',
  CRAWLER_TIP: 'bg-purple-100 text-purple-700',
};

/** 投稿/报错/找赛审核队列：待审在前，通过/拒绝仅改状态 */
export default async function AdminSubmissionsPage() {
  await requireAdmin();
  const [pending, reviewed] = await Promise.all([
    prisma.submission.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } }),
    // 已处理归档：最近 50 条
    prisma.submission.findMany({
      where: { status: { not: 'PENDING' } },
      orderBy: { reviewedAt: 'desc' },
      take: 50,
    }),
  ]);

  // 关联赛事名（报错修正/找赛需求可能挂了 eventId）
  const eventIds = [
    ...new Set([...pending, ...reviewed].map((s) => s.eventId).filter((x): x is string => Boolean(x))),
  ];
  const events = eventIds.length
    ? await prisma.event.findMany({ where: { id: { in: eventIds } }, select: { id: true, name: true } })
    : [];
  const evName = new Map(events.map((e) => [e.id, e.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">投稿审核</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          待审核 {pending.length} 条。通过/拒绝只改变状态；赛事类投稿核实后请到「赛事管理 → 新建赛事」入库。
        </p>
      </div>

      {/* 待审核 */}
      <section className="space-y-3">
        {pending.map((s) => (
          <article key={s.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${TYPE_BADGE[s.type] ?? 'bg-gray-100 text-gray-600'}`}>
                {SUBMISSION_TYPE[s.type as SubmissionTypeKey] ?? s.type}
              </span>
              {(s.city || s.category) && (
                <span className="text-gray-500">
                  {s.city || '不限'} · {s.category || '不限'}
                </span>
              )}
              <span className="text-gray-400">{s.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</span>
              {s.eventId && (
                <Link href={`/admin/events/${s.eventId}`} className="text-brand-600 hover:underline">
                  关联赛事：{evName.get(s.eventId) ?? s.eventId} ↗
                </Link>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{s.content}</p>
            {s.contact && <p className="mt-2 text-xs text-gray-400">联系方式：{s.contact}</p>}
            <div className="mt-3 flex items-center gap-2">
              <form action={reviewSubmissionAction}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="decision" value="APPROVED" />
                <button type="submit" className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700">
                  通过
                </button>
              </form>
              <form action={reviewSubmissionAction}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="decision" value="REJECTED" />
                <button type="submit" className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                  拒绝
                </button>
              </form>
              {s.type === 'EVENT_TIP' && (
                <Link
                  href="/admin/events/new"
                  className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                >
                  核实后去新建赛事 →
                </Link>
              )}
            </div>
          </article>
        ))}
        {pending.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-400">
            暂无待审核内容
          </p>
        )}
      </section>

      {/* 已处理归档 */}
      {reviewed.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-900">最近已处理</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">类型</th>
                  <th className="px-3 py-2.5 font-semibold">内容摘要</th>
                  <th className="px-3 py-2.5 font-semibold">结果</th>
                  <th className="px-3 py-2.5 font-semibold">处理时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviewed.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 text-gray-600">{SUBMISSION_TYPE[s.type as SubmissionTypeKey] ?? s.type}</td>
                    <td className="max-w-[360px] truncate px-3 py-2.5 text-gray-500">{s.content}</td>
                    <td className="px-3 py-2.5">
                      {s.status === 'APPROVED' ? (
                        <span className="text-xs font-semibold text-green-600">已通过</span>
                      ) : (
                        <span className="text-xs font-semibold text-gray-400">已拒绝</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400">
                      {s.reviewedAt?.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
