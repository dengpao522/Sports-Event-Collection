import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { CATEGORIES, CITIES } from '@/lib/constants';
import { deleteGapAction, saveGapAction } from '../actions';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

/** 品类空窗说明维护：前台空窗卡的文案来源，按城市+品类唯一 */
export default async function AdminGapsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const gaps = await prisma.gapReason.findMany({ orderBy: [{ city: 'asc' }, { category: 'asc' }] });
  const categoryLabel = (key: string) => (key === '全部' ? '全部（城市通用）' : (CATEGORIES.find((c) => c.key === key)?.label ?? key));

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">品类空窗说明</h1>
        <p className="mt-1 text-sm text-gray-500">
          前台「该品类暂无可报名赛事」空窗卡展示的文案。某品类有赛了可删除对应说明，恢复默认提示。共 {gaps.length} 条。
        </p>
      </div>

      {sp.saved && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">已保存。</p>}
      {sp.deleted && <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">已删除。</p>}
      {sp.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{sp.error}</p>}

      {/* 新增/修改说明 */}
      <form action={saveGapAction} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-4">
        <select name="city" required className={inputCls} aria-label="城市">
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select name="category" required className={inputCls} aria-label="品类">
          <option value="全部">全部（城市通用）</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <input name="reason" required placeholder="空窗原因，如：下一档集中明年3月" className={`${inputCls} sm:col-span-2`} />
        <input name="seasonNote" placeholder="往年档期规律（选填），如：每年元旦/五一各一场" className={`${inputCls} sm:col-span-2`} />
        <button type="submit" className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-600 sm:col-span-2">
          {gaps.length ? '保存（同城市+品类则覆盖）' : '新增说明'}
        </button>
      </form>

      {/* 已有说明列表 */}
      <div className="space-y-3">
        {gaps.map((g) => (
          <details key={g.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-bold text-gray-900">
              {g.city} · {categoryLabel(g.category)}
              <span className="ml-2 font-normal text-gray-400">（点击展开编辑）</span>
            </summary>
            <form action={saveGapAction} className="mt-3 space-y-3">
              <input type="hidden" name="city" value={g.city} />
              <input type="hidden" name="category" value={g.category} />
              <div>
                <label className="block text-xs font-semibold text-gray-500">空窗原因</label>
                <input name="reason" defaultValue={g.reason} required className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500">往年档期规律（选填）</label>
                <input name="seasonNote" defaultValue={g.seasonNote} className={`mt-1 ${inputCls}`} />
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-600">
                  保存修改
                </button>
              </div>
            </form>
            <form action={deleteGapAction} className="mt-2">
              <input type="hidden" name="id" value={g.id} />
              <button type="submit" className="rounded-lg border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                删除这条说明
              </button>
            </form>
          </details>
        ))}
        {gaps.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-400">
            暂无空窗说明，可用上方表单新增
          </p>
        )}
      </div>
    </div>
  );
}
