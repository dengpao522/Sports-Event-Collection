/**
 * 赛事状态时间线（服务端组件，纯展示）
 * 五段：待官宣 → 报名中 → 报名截止 → 开赛 → 已结束；延期/取消以红色条另行提示
 */
const STEPS = ['待官宣', '报名中', '报名截止', '开赛', '已结束'] as const;

// 报名状态 → 当前所处阶段下标
const STATUS_STEP: Record<string, number> = {
  PENDING_ANNOUNCEMENT: 0,
  UPCOMING: 0,
  UNVERIFIED: 0,
  OPEN: 1,
  FIRST_COME: 1,
  CLOSED: 2,
  POSTPONED: 2,
  ONGOING: 3,
  FINISHED: 4,
};

export function StatusTimeline({ status }: { status: string }) {
  const cur = STATUS_STEP[status] ?? 0;
  return (
    <div className="flex items-center py-2">
      {STEPS.map((label, i) => (
        <div key={label} className="relative flex-1 text-center">
          {/* 连接线 */}
          {i < STEPS.length - 1 && (
            <div
              className={`absolute left-1/2 top-[7px] h-0.5 w-full ${
                i < cur ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
          <div
            className={`relative z-10 mx-auto h-3.5 w-3.5 rounded-full border-2 border-white ${
              i < cur
                ? 'bg-green-500 shadow-[0_0_0_1px_#22c55e]'
                : i === cur
                  ? 'bg-brand-500 shadow-[0_0_0_4px_#fed7aa]'
                  : 'bg-gray-300 shadow-[0_0_0_1px_#d1d5db]'
            }`}
          />
          <div
            className={`mt-1.5 text-[11px] ${
              i === cur ? 'font-bold text-brand-700' : i < cur ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
