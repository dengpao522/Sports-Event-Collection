'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CITIES, HOT_CITIES, PROVINCE_CITIES, CATEGORIES } from '@/lib/constants';
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
  // 「全部地区」省市级联面板状态
  const [regionOpen, setRegionOpen] = useState(false);
  const [activeProvince, setActiveProvince] = useState<string>('江苏');
  const [regionFilter, setRegionFilter] = useState('');

  // 订阅弹窗
  const [modal, setModal] = useState<{ open: boolean; topic: string; req: Record<string, unknown> }>({
    open: false,
    topic: '',
    req: {},
  });

  // 已开通城市 = 库内有已发布赛事的城市 ∪ 常量 25 城（保底可筛选）
  const openedCities = useMemo(() => {
    const s = new Set<string>(CITIES);
    for (const e of events) {
      if (e.city) s.add(e.city);
    }
    return s;
  }, [events]);

  // 动态城市中不在省市映射里的（县级/新区等采集推断名），归入「其他地区」tab
  const extraRegions = useMemo(() => {
    const known = new Set(PROVINCE_CITIES.flatMap((p) => p.cities));
    return Array.from(openedCities).filter((c) => !known.has(c)).sort();
  }, [openedCities]);

  // 级联面板当前省的城市列表（映射城市 ∪ 该省动态城市）
  const provinceCities = useMemo(() => {
    if (activeProvince === '其他地区') return extraRegions;
    const mapped = PROVINCE_CITIES.find((p) => p.province === activeProvince)?.cities ?? [];
    // 动态城市若属于该省（在映射里）自然包含；不在映射的动态城市已归其他地区
    return Array.from(new Set([...mapped, ...extraRegions])).filter(
      (c) => mapped.includes(c) || activeProvince === '其他地区',
    );
  }, [activeProvince, extraRegions]);

  // 面板搜索：跨省匹配城市（返回 [省名, 城市名]）
  const searchResults = useMemo(() => {
    const q = regionFilter.trim();
    if (!q) return null;
    const all: Array<{ province: string; city: string }> = [];
    for (const p of PROVINCE_CITIES) {
      for (const c of p.cities) {
        if (c.includes(q) || p.province.includes(q)) all.push({ province: p.province, city: c });
      }
    }
    for (const c of extraRegions) {
      if (c.includes(q)) all.push({ province: '其他地区', city: c });
    }
    return all;
  }, [regionFilter, extraRegions]);

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

  /** 选择城市：已开通直接筛选；未开通弹订阅提醒 */
  const pickCity = (c: string) => {
    if (openedCities.has(c)) {
      setCity(c);
      setRegionOpen(false);
      setRegionFilter('');
    } else {
      setModal({
        open: true,
        topic: `开通提醒：${c}`,
        req: { type: 'CITY_LAUNCH', city: c },
      });
    }
  };

  return (
    <div>
      {/* 搜索框 */}
      <input
        value={kw}
        onChange={(e) => setKw(e.target.value)}
        placeholder="搜索赛事名 / 地点，如：马拉松、滨江、登高"
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />

      {/* 地区：热门城市 pill + 全部地区级联入口 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[...HOT_CITIES, ...(HOT_CITIES.includes(city as (typeof HOT_CITIES)[number]) ? [] : [city])].map((c) => (
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
        <button
          onClick={() => setRegionOpen((v) => !v)}
          className={`rounded-full border px-3 py-1.5 text-sm transition ${
            regionOpen
              ? 'border-brand-400 bg-brand-50 font-semibold text-brand-700'
              : 'border-dashed border-gray-300 text-gray-500 hover:border-brand-300 hover:text-brand-600'
          }`}
        >
          {regionOpen ? '收起地区 ▴' : '全部地区 ▾'}
        </button>
      </div>

      {/* 省市级联面板 */}
      {regionOpen && (
        <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          <input
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            placeholder="搜索城市 / 省份，如：三亚、浙江"
            className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          {searchResults ? (
            /* 搜索模式：跨省列出匹配城市 */
            <div className="flex flex-wrap gap-1.5">
              {searchResults.map(({ province, city: c }) => (
                <button
                  key={`${province}-${c}`}
                  onClick={() => pickCity(c)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    openedCities.has(c)
                      ? 'border-brand-300 bg-white text-brand-700 hover:bg-brand-50'
                      : 'border-dashed border-gray-300 bg-white text-gray-500 hover:border-brand-300'
                  }`}
                  title={openedCities.has(c) ? '查看该城赛事' : '订阅开通提醒'}
                >
                  {c}
                  <span className="ml-1 text-gray-400">{province}</span>
                </button>
              ))}
              {searchResults.length === 0 && (
                <span className="px-2 py-1 text-xs text-gray-400">未找到该城市，可直接在上方搜索赛事试试</span>
              )}
            </div>
          ) : (
            /* 省市两级模式：左侧省份 tab，右侧城市 pill */
            <div className="flex gap-3">
              <div className="max-h-64 w-28 shrink-0 overflow-y-auto rounded-lg bg-white p-1">
                {[
                  ...PROVINCE_CITIES.map((p) => p.province),
                  ...(extraRegions.length > 0 ? ['其他地区'] : []),
                ].map((p) => (
                  <button
                    key={p}
                    onClick={() => setActiveProvince(p)}
                    className={`block w-full rounded-md px-2 py-1.5 text-left text-xs ${
                      activeProvince === p
                        ? 'bg-brand-50 font-semibold text-brand-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 text-xs text-gray-400">
                  {activeProvince} · 实心为已开通，虚线点击订阅开通提醒
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {provinceCities.map((c) => (
                    <button
                      key={c}
                      onClick={() => pickCity(c)}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        city === c
                          ? 'border-brand-500 bg-brand-500 font-semibold text-white'
                          : openedCities.has(c)
                            ? 'border-gray-300 bg-white text-gray-700 hover:border-brand-300 hover:text-brand-600'
                            : 'border-dashed border-gray-300 bg-white text-gray-400 hover:border-brand-300'
                      }`}
                      title={openedCities.has(c) ? '查看该城赛事' : '订阅开通提醒'}
                    >
                      {c}
                    </button>
                  ))}
                  {provinceCities.length === 0 && (
                    <span className="px-2 py-1 text-xs text-gray-400">该地区暂无城市</span>
                  )}
                </div>
              </div>
            </div>
          )}
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
