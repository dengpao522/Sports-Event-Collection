'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CITIES, SOON_CITIES, CATEGORIES } from '@/lib/constants';
import { EventCard, type EventCardData } from './EventCard';
import { NotifyModal } from './NotifyModal';

type StatusGroup = 'open' | 'soon' | 'closed';

/** 空窗说明（服务端从 GapReason 表读取后传入） */
export type GapItem = { city: string; category: string; reason: string; seasonNote: string };

const STATUS_GROUPS: Array<{ key: StatusGroup; label: string; statuses: string[] }> = [
  { key: 'open', label: '可报名', statuses: ['OPEN', 'FIRST_COME'] },
  { key: 'soon', label: '即将/待官宣', statuses: ['UPCOMING', 'PENDING_ANNOUNCEMENT', 'UNVERIFIED'] },
  { key: 'closed', label: '已截止/结束', statuses: ['CLOSED', 'ONGOING', 'FINISHED', 'POSTPONED'] },
];

export function Discovery({ events, gaps }: { events: EventCardData[]; gaps: GapItem[] }) {
  const [city, setCity] = useState<string>('上海');
  const [category, setCategory] = useState<string>('全部');
  const [groups, setGroups] = useState<Record<StatusGroup, boolean>>({
    open: true,
    soon: true,
    closed: false,
  });
  const [kw, setKw] = useState('');
  // “更多即将开通城市”折叠面板
  const [soonOpen, setSoonOpen] = useState(false);

  // 订阅弹窗
  const [modal, setModal] = useState<{ open: boolean; topic: string; req: Record<string, unknown> }>({
    open: false,
    topic: '',
    req: {},
  });

  const allowedStatuses = useMemo(
    () => STATUS_GROUPS.filter((g) => groups[g.key]).flatMap((g) => g.statuses),
    [groups],
  );

  const list = useMemo(() => {
    const q = kw.trim().toLowerCase();
    return events.filter((e) => {
      if (e.city !== city) return false;
      // MVP 发现页只展示“可参加”的赛事（含历史参考）；纯观赛内容暂不收录到前台
      if (e.kind === 'VIEWING') return false;
      if (category !== '全部' && e.category !== category) return false;
      if (!allowedStatuses.includes(e.status)) return false;
      if (q) {
        const hay = `${e.name} ${e.venue} ${e.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, city, category, allowedStatuses, kw]);

  // 当前城市×品类的空窗说明
  const gap = useMemo(() => {
    return (
      gaps.find((g) => g.city === city && g.category === category) ||
      gaps.find((g) => g.city === city && g.category === '全部')
    );
  }, [gaps, city, category]);

  return (
    <div>
      {/* 搜索框 */}
      <input
        value={kw}
        onChange={(e) => setKw(e.target.value)}
        placeholder="搜索赛事名 / 地点，如：马拉松、滨江、登高"
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />

      {/* 城市 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {CITIES.map((c) => (
          <button
            key={c}
            onClick={() => setCity(c)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              city === c
                ? 'border-brand-500 bg-brand-500 font-semibold text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-brand-300'
            }`}
          >
            {c}
          </button>
        ))}
        {/* 江浙沪更多城市：折叠展示，点击城市名订阅开通提醒 */}
        <button
          onClick={() => setSoonOpen((v) => !v)}
          className="rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-400 hover:border-brand-300 hover:text-brand-600"
        >
          {soonOpen ? '收起' : `江浙沪更多城市（${SOON_CITIES.length} 城即将开通）▾`}
        </button>
      </div>
      {soonOpen && (
        <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          {SOON_CITIES.map((c) => (
            <button
              key={c}
              onClick={() =>
                setModal({
                  open: true,
                  topic: `开通提醒：${c}`,
                  req: { type: 'CITY_LAUNCH', city: c },
                })
              }
              className="rounded-full border border-dashed border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-500 hover:border-brand-300 hover:text-brand-600"
              title="订阅开通提醒"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* 品类 */}
      <div className="mt-3 flex flex-wrap gap-2">
        <CatChip active={category === '全部'} onClick={() => setCategory('全部')}>
          全部
        </CatChip>
        {CATEGORIES.map((c) => (
          <CatChip key={c.key} active={category === c.key} onClick={() => setCategory(c.key)}>
            {c.label}
          </CatChip>
        ))}
      </div>

      {/* 状态组 */}
      <div className="mt-3 flex flex-wrap gap-2">
        {STATUS_GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setGroups((s) => ({ ...s, [g.key]: !s[g.key] }))}
            className={`rounded-full px-3 py-1 text-xs ${
              groups[g.key]
                ? 'bg-gray-900 font-semibold text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* 结果数 */}
      <div className="mt-5 mb-3 text-sm text-gray-500">
        {city} · {category === '全部' ? '全品类' : category} · 共 <b className="text-gray-900">{list.length}</b> 场
      </div>

      {/* 列表 / 空窗态 */}
      {list.length > 0 ? (
        <div className="grid gap-3">
          {list.map((e) => (
            <EventCard key={e.id} ev={e} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <div className="text-4xl">🔍</div>
          <p className="mt-3 font-bold text-gray-800">
            {city} · {category === '全部' ? '全品类' : category} 暂无可显示赛事
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
            {gap?.reason
              ? `${gap.reason}${gap.seasonNote && gap.seasonNote !== '—' ? `（${gap.seasonNote}）` : ''}`
              : '该城市/品类当前可能处于赛季空窗，或个人可报名赛事较少。你可以订阅新赛提醒，或告诉我们你想找什么比赛。'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-bold text-white hover:bg-brand-600"
              onClick={() =>
                setModal({
                  open: true,
                  topic: `${city} · ${category === '全部' ? '全品类' : category} 有新赛事`,
                  req: { type: 'CITY_CATEGORY_NEW', city, category: category === '全部' ? null : category },
                })
              }
            >
              有赛通知我
            </button>
            <Link
              href={`/submit?type=FIND_REQUEST&city=${encodeURIComponent(city)}&category=${encodeURIComponent(
                category === '全部' ? '' : category,
              )}`}
              className="rounded-lg border border-brand-500 px-5 py-2 text-sm font-bold text-brand-600 hover:bg-brand-50"
            >
              我要找的比赛
            </Link>
          </div>
        </div>
      )}

      <NotifyModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        topic={modal.topic}
        subRequest={modal.req as never}
      />
    </div>
  );
}

function CatChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs ${
        active
          ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700'
          : 'border-gray-300 bg-white text-gray-600 hover:border-brand-300'
      }`}
    >
      {children}
    </button>
  );
}
