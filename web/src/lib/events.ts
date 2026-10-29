/**
 * 赛事查询与排序逻辑（服务端使用）
 */
import { prisma } from './prisma';

export type EventWithRelations = Awaited<ReturnType<typeof getPublishedEvents>>[number];

// 列表排序权重：数字越小越靠前（PRD FR-01：紧迫的在前，已结束沉底）
const STATUS_RANK: Record<string, number> = {
  FIRST_COME: 0, // 报满即止，最紧迫
  OPEN: 1, // 报名中
  UPCOMING: 2, // 即将报名
  PENDING_ANNOUNCEMENT: 3, // 待官宣
  UNVERIFIED: 4, // 待核实
  POSTPONED: 5,
  CLOSED: 6,
  ONGOING: 7,
  FINISHED: 8,
};

/** 取全部已发布赛事（MVP 数据量小，沪杭约百条，首页一次下发给客户端做即时筛选） */
export async function getPublishedEvents() {
  const events = await prisma.event.findMany({
    where: { isPublished: true },
    orderBy: [{ raceDateStart: 'asc' }],
  });

  // 排序：可报名优先 → 状态紧迫度 → 比赛日近优先（无日期排同组末尾）
  return events.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'PARTICIPATABLE' ? -1 : 1;
    }
    const ra = STATUS_RANK[a.status] ?? 9;
    const rb = STATUS_RANK[b.status] ?? 9;
    if (ra !== rb) return ra - rb;
    if (a.raceDateStart && b.raceDateStart) {
      return a.raceDateStart.getTime() - b.raceDateStart.getTime();
    }
    if (a.raceDateStart) return -1;
    if (b.raceDateStart) return 1;
    return 0;
  });
}

/** 取城市×品类空窗说明（无精确品类时回退城市通用说明） */
export async function getGapReason(city: string, category: string) {
  return (
    (await prisma.gapReason.findUnique({ where: { city_category: { city, category } } })) ||
    (await prisma.gapReason.findUnique({ where: { city_category: { city, category: '全部' } } })) ||
    null
  );
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({ where: { id } });
}

/**
 * 容错解析赛事标签 JSON：库内 tags 为 JSON 字符串，历史/爬虫异常数据可能是非法 JSON
 * 或非数组结构，直接 JSON.parse 会抛错导致整页 500。此处统一降级为空数组。
 * 列表页/详情页等多处复用，避免各页重复 try/catch。
 */
export function parseTags(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    // 非法 JSON 或非数组 → 视为无标签
    return [];
  }
}
