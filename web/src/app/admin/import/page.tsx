import { requireAdmin } from '@/lib/auth';
import { CITIES } from '@/lib/constants';
import { importSheetAction } from '../actions';

export const dynamic = 'force-dynamic';

/** 批量导入：上传城市清单 xlsx，幂等入库（新增/更新/空窗说明统计） */
export default async function AdminImportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">导入赛事清单</h1>
        <p className="mt-1 text-sm text-gray-500">
          上传运营维护的城市清单 Excel（.xlsx），与命令行 <code className="rounded bg-gray-100 px-1">npm run import</code> 完全同一套逻辑：按「城市+赛事名」幂等入库，重复导入只会更新、不会产生重复赛事。
        </p>
      </div>

      {sp.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{sp.error}</p>}
      {sp.done && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-bold">导入完成（{sp.city}）</p>
          <p className="mt-1">
            新增赛事 <b>{sp.inserted}</b> 场 · 更新 <b>{sp.updated}</b> 场 · 空窗说明 <b>{sp.gap}</b> 条 · 跳过空行 <b>{sp.skipped}</b> 行
          </p>
        </div>
      )}

      <form action={importSheetAction} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div>
          <label htmlFor="city" className="block text-sm font-semibold text-gray-700">
            清单归属城市 *
          </label>
          <select
            id="city"
            name="city"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="file" className="block text-sm font-semibold text-gray-700">
            清单文件（.xlsx）*
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xlsx"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700"
          />
          <p className="mt-2 text-xs text-gray-400">
            工作表约定：赛事表直接导入；名称含「空窗」的表导入为品类空窗说明；含「档期/规律」的表跳过。
          </p>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
        >
          开始导入
        </button>
      </form>
    </div>
  );
}
