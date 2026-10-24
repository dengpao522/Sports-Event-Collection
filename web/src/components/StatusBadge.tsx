import { REG_STATUS, type RegStatusKey } from '@/lib/constants';

/** 报名状态徽章 */
export function StatusBadge({ status }: { status: string }) {
  const meta = REG_STATUS[status as RegStatusKey] ?? REG_STATUS.UNVERIFIED;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}
