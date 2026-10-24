import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { CITIES, REG_STATUS, SOON_CITIES } from '@/lib/constants';
import { StatusBadge } from '@/components/StatusBadge';
import { togglePublishAction } from '@/app/admin/actions';
import { DeleteEventButton } from '@/components/admin/DeleteEventButton';

export const dynamic = 'force-dynamic';

const inputCls =
  'rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

/** 赛事管理列表：搜索 + 城市/状态筛选，含上下架与删除 */
export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; status?: string; saved?: string; deleted?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();

  // 按筛选条件组装查询（SQLite contains 为精确子串匹配，中文场景无大小写问题）
  const where: Prisma.EventWhereInput = {};
  if (sp.city) where.city = sp.city;
  if (sp.status) where.status = sp.status;
  if (q) where.OR = [{ name: { contains: q } }, { venue: { contains: q } }];

  const events = await prisma.event.findMany({ where, orderBy: { updatedAt: 'desc' } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">赛事管理</h1>
          <p className="mt-0.5 text-sm text-gray-500">共 {events.length} 场（按最近修改排序）</p>
        </div>
        <Link
          href="/admin/events/new"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
        >
          + 新建赛事
        </Link>
      </div>

      {sp.saved && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">已保存。</p>}
      {sp.deleted && <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">已删除。</p>}

      {/* 筛选表单（GET 提交，无 JS） */}
      <form className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <input name="q" defaultValue={q} placeholder="搜索名称 / 地点" className={`${inputCls} w-48`} />
        <select name="city" defaultValue={sp.city ?? ''} className={inputCls}>
          <option value="">全部城市</option>
          {[...CITIES, ...SOON_CITIES].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? ''} className={inputCls}>
          <option value="">全部状态</option>
          {Object.entries(REG_STATUS).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-700">
          筛选
        </button>
        <Link href="/admin/events" className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700">
          重置
        </Link>
      </form>

      {/* 赛事表格 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2.5 font-semibold">赛事</th>
              <th className="px-3 py-2.5 font-semibold">城市</th>
              <th className="px-3 py-2.5 font-semibold">品类</th>
              <th className="px-3 py-2.5 font-semibold">状态</th>
              <th className="px-3 py-2.5 font-semibold">比赛日期</th>
              <th className="px-3 py-2.5 font-semibold">发布</th>
              <th className="px-3 py-2.5 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.map((ev) => (
              <tr key={ev.id} className="hover:bg-gray-50/60">
                <td className="max-w-[280px] px-4 py-2.5">
                  <Link href={`/admin/events/${ev.id}`} className="font-semibold text-gray-900 hover:text-brand-600">
                    {ev.name}
                  </Link>
                  {ev.venue && <p className="truncate text-xs text-gray-400">{ev.venue}</p>}
                </td>
                <td className="px-3 py-2.5 text-gray-600">{ev.city}</td>
                <td className="px-3 py-2.5 text-gray-600">{ev.category}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={ev.status} />
                </td>
                <td className="max-w-[150px] truncate px-3 py-2.5 text-gray-500">{ev.raceDateText || '—'}</td>
                <td className="px-3 py-2.5">
                  {ev.isPublished ? (
                    <span className="text-xs font-semibold text-green-600">已发布</span>
                  ) : (
                    <span className="text-xs font-semibold text-gray-400">草稿</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/events/${ev.id}`}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      编辑
                    </Link>
                    <form action={togglePublishAction}>
                      <input type="hidden" name="id" value={ev.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        {ev.isPublished ? '下架' : '上架'}
                      </button>
                    </form>
                    <DeleteEventButton id={ev.id} name={ev.name} />
                  </div>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  没有符合条件的赛事
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
