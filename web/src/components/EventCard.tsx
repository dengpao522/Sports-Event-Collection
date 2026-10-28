import Link from 'next/link';
import { StatusBadge } from './StatusBadge';

/** 传给客户端的赛事精简结构（日期转 ISO 字符串，保证可序列化） */
export interface EventCardData {
  id: string;
  name: string;
  city: string;
  category: string;
  tags: string[];
  status: string;
  kind: string;
  verifyStatus: string;
  raceDateText: string;
  raceDateStart: string | null;
  venue: string;
  deadlineText: string;
}

const KIND_LABEL: Record<string, string> = {
  VIEWING: '仅观赛',
  REFERENCE: '历史参考',
};

/** 赛事列表卡片 */
export function EventCard({ ev }: { ev: EventCardData }) {
  return (
    <Link
      href={`/events/${ev.id}`}
      className="event-card block rounded-xl border border-gray-200 bg-white p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-bold leading-snug text-gray-900">{ev.name}</h3>
        <StatusBadge status={ev.status} />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-gray-500">
        <span>📅 {ev.raceDateText}</span>
        {/* 全国化后列表混合多城市/省域/全国性赛事，城市是必要定位信息 */}
        <span>📍 {ev.city}</span>
        {ev.venue && <span>🏃 {ev.venue}</span>}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">
          {ev.category}
        </span>
        {ev.tags.slice(0, 3).map((t) => (
          <span key={t} className="text-gray-400">
            #{t}
          </span>
        ))}
        {ev.kind !== 'PARTICIPATABLE' && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">
            {KIND_LABEL[ev.kind] ?? ''}
          </span>
        )}
        {ev.verifyStatus === 'VERIFIED' ? (
          <span className="ml-auto text-blue-600">✓ 官方已核实</span>
        ) : (
          <span className="ml-auto text-amber-600">● 信息待核实</span>
        )}
      </div>
    </Link>
  );
}
