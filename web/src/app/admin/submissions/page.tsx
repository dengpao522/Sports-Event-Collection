import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { SUBMISSION_TYPE, type SubmissionTypeKey } from '@/lib/constants';
import {
  bulkReviewAction,
  reviewSubmissionAction,
  runAutocheckAction,
} from '@/app/admin/actions';

export const dynamic = 'force-dynamic';

// 投稿类型徽章配色
const TYPE_BADGE: Record<string, string> = {
  EVENT_TIP: 'bg-brand-100 text-brand-700',
  CORRECTION: 'bg-red-100 text-red-700',
  FIND_REQUEST: 'bg-blue-100 text-blue-700',
  CRAWLER_TIP: 'bg-purple-100 text-purple-700',
};

/** 投稿/报错/找赛审核队列：采集线索支持自动核对与一键批量处理 */
export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  // 手工投稿（EVENT_TIP/CORRECTION/FIND_REQUEST）
  const [pendingManual, reviewed, crawlerPending] = await Promise.all([
    prisma.submission.findMany({
      where: { status: 'PENDING', type: { not: 'CRAWLER_TIP' } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.submission.findMany({
      where: { status: { not: 'PENDING' } },
      orderBy: { reviewedAt: 'desc' },
      take: 50,
    }),
    prisma.submission.findMany({
      where: { type: 'CRAWLER_TIP', status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // 采集线索按自动核对结果分组
  const autoPass = crawlerPending.filter((s) => s.autoStatus === 'AUTO_PASS');
  const autoReject = crawlerPending.filter((s) => s.autoStatus === 'AUTO_REJECT');
  const needHuman = crawlerPending.filter(
    (s) => s.autoStatus !== 'AUTO_PASS' && s.autoStatus !== 'AUTO_REJECT',
  );
  const unchecked = crawlerPending.filter((s) => !s.autoStatus);

  // 关联赛事名（报错修正/找赛需求可能挂了 eventId）
  const eventIds = [
    ...new Set(pendingManual.map((s) => s.eventId).filter((x): x is string => Boolean(x))),
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
          待审核 {pendingManual.length + crawlerPending.length} 条（采集线索 {crawlerPending.length}）
        </p>
      </div>

      {sp.checked && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          🤖 本批自动核对 {sp.checked} 条：高置信 {sp.autoPass} · 已过期 {sp.autoReject} · 需人工{' '}
          {sp.needHuman}
          {Number(sp.remaining) > 0 && `，剩余 ${sp.remaining} 条（再次点击按钮继续）`}
        </div>
      )}
      {sp.bulk && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          已批量{sp.bulk === 'approved' ? '通过' : '拒绝'}「
          {sp.group === 'AUTO_PASS' ? '高置信' : '已过期'}」整组线索。
        </p>
      )}

      {/* ---------- 采集线索：自动核对 + 分组一键处理 ---------- */}
      <section className="rounded-xl border border-purple-200 bg-purple-50/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">🤖 采集线索自动核对</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              机器逐条打开原文：提取发布时间与正文 → 自动判定「高置信 / 已过期 / 需人工」。
              每次处理 25 条，{crawlerPending.length > 0 && `当前共 ${crawlerPending.length} 条待处理`}
              {unchecked.length > 0 && `（其中 ${unchecked.length} 条尚未核对）`}
              {crawlerPending.length === 0 && '，当前队列为空'}。
            </p>
          </div>
          {crawlerPending.length > 0 && (
            <form action={runAutocheckAction}>
              <button
                type="submit"
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700"
              >
                🤖 自动核对一批（25 条）
              </button>
            </form>
          )}
        </div>

        {crawlerPending.length > 0 && (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {/* 高置信 */}
            <div className="rounded-xl border border-green-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-green-700">✅ 高置信 {autoPass.length}</h3>
                {autoPass.length > 0 && (
                  <form action={bulkReviewAction}>
                    <input type="hidden" name="autoStatus" value="AUTO_PASS" />
                    <input type="hidden" name="decision" value="APPROVED" />
                    <button type="submit" className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700">
                      一键全部通过
                    </button>
                  </form>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">机器确认：近期发布且正文含报名信息</p>
              <ul className="mt-2 space-y-2">
                {autoPass.slice(0, 8).map((s) => (
                  <li key={s.id} className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    <p className="truncate font-semibold">{s.content.split('\n')[0]}</p>
                    <p className="mt-0.5 truncate text-gray-400">{s.autoNote}</p>
                  </li>
                ))}
                {autoPass.length > 8 && (
                  <li className="text-xs text-gray-400">…等 {autoPass.length} 条</li>
                )}
                {autoPass.length === 0 && <li className="text-xs text-gray-400">暂无</li>}
              </ul>
            </div>
            {/* 已过期 */}
            <div className="rounded-xl border border-red-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-red-600">⛔ 已过期 {autoReject.length}</h3>
                {autoReject.length > 0 && (
                  <form action={bulkReviewAction}>
                    <input type="hidden" name="autoStatus" value="AUTO_REJECT" />
                    <input type="hidden" name="decision" value="REJECTED" />
                    <button type="submit" className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">
                      一键全部拒绝
                    </button>
                  </form>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">机器确认：发布超 200 天或正文仅含旧年份</p>
              <ul className="mt-2 space-y-2">
                {autoReject.slice(0, 8).map((s) => (
                  <li key={s.id} className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    <p className="truncate font-semibold">{s.content.split('\n')[0]}</p>
                    <p className="mt-0.5 truncate text-gray-400">{s.autoNote}</p>
                  </li>
                ))}
                {autoReject.length > 8 && (
                  <li className="text-xs text-gray-400">…等 {autoReject.length} 条</li>
                )}
                {autoReject.length === 0 && <li className="text-xs text-gray-400">暂无</li>}
              </ul>
            </div>
            {/* 需人工 */}
            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <h3 className="text-sm font-bold text-amber-600">👀 需人工 {needHuman.length}</h3>
              <p className="mt-1 text-xs text-gray-400">
                链接失效、无明确报名动作等机器拿不准的条目（含未核对的）
              </p>
              <ul className="mt-2 space-y-2">
                {needHuman.slice(0, 6).map((s) => (
                  <li key={s.id} className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    <p className="truncate font-semibold">{s.content.split('\n')[0] || '（无标题）'}</p>
                    <div className="mt-1.5 flex gap-2">
                      <form action={reviewSubmissionAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="decision" value="APPROVED" />
                        <button type="submit" className="rounded bg-green-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-green-700">
                          通过
                        </button>
                      </form>
                      <form action={reviewSubmissionAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="decision" value="REJECTED" />
                        <button type="submit" className="rounded border border-gray-300 px-2 py-0.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">
                          拒绝
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
                {needHuman.length > 6 && (
                  <li className="text-xs text-gray-400">…等 {needHuman.length} 条</li>
                )}
                {needHuman.length === 0 && <li className="text-xs text-gray-400">暂无</li>}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* ---------- 手工投稿队列 ---------- */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900">用户投稿 / 报错 / 找赛（{pendingManual.length}）</h2>
        {pendingManual.map((s) => (
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
              <span className="text-gray-400">
                {s.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
              </span>
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
        {pendingManual.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-400">
            暂无待审核的用户投稿
          </p>
        )}
      </section>

      {/* ---------- 已处理归档 ---------- */}
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
                    <td className="px-4 py-2.5 text-gray-600">
                      {SUBMISSION_TYPE[s.type as SubmissionTypeKey] ?? s.type}
                    </td>
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
