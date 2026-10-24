/**
 * 全站统一定义的枚举取值与展示口径（单一真源）
 * 对应 PRD：5.2 品类体系、5.3 报名状态、8.2 可信度、订阅类型
 */

// MVP 开放城市（江浙沪全部地级市均已开放）
export const CITIES = [
  '上海', '杭州', '南京', '苏州', '无锡', '宁波',
  // 江苏
  '常州', '徐州', '南通', '连云港', '淮安', '盐城', '扬州', '镇江', '泰州', '宿迁',
  // 浙江
  '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水',
] as const;
// 已无待开通城市（江浙沪全覆盖）
export const SOON_CITIES: string[] = [];
export type City = (typeof CITIES)[number];

// 一级品类（筛选用，顺序即展示顺序）
export const CATEGORIES = [
  { key: '跑步', label: '跑步/路跑' },
  { key: '球类', label: '球类' },
  { key: '户外', label: '户外' },
  { key: '骑行', label: '骑行' },
  { key: '水上', label: '水上' },
  { key: '冰雪', label: '冰雪' },
  { key: '室内健身', label: '室内/健身' },
  { key: '棋牌智力', label: '棋牌/智力' },
  { key: '其他综合', label: '其他/综合' },
] as const;

// 报名状态（库内存储 key → 中文展示 + 徽章配色）
export const REG_STATUS = {
  PENDING_ANNOUNCEMENT: { label: '待官宣', badge: 'bg-amber-100 text-amber-700' },
  UPCOMING: { label: '即将报名', badge: 'bg-blue-100 text-blue-700' },
  OPEN: { label: '报名中', badge: 'bg-green-100 text-green-700' },
  FIRST_COME: { label: '报满即止', badge: 'bg-orange-100 text-orange-700' },
  CLOSED: { label: '已截止', badge: 'bg-gray-100 text-gray-500' },
  ONGOING: { label: '进行中', badge: 'bg-gray-100 text-gray-600' },
  FINISHED: { label: '已结束', badge: 'bg-gray-100 text-gray-400' },
  POSTPONED: { label: '延期/取消', badge: 'bg-red-100 text-red-700' },
  UNVERIFIED: { label: '待核实', badge: 'bg-yellow-50 text-yellow-600 border border-yellow-200' },
} as const;
export type RegStatusKey = keyof typeof REG_STATUS;

// 前台默认可见（“可报名”口径）
export const OPEN_STATUSES: RegStatusKey[] = ['OPEN', 'FIRST_COME'];
export const SOON_STATUSES: RegStatusKey[] = ['PENDING_ANNOUNCEMENT', 'UPCOMING'];
export const CLOSED_STATUSES: RegStatusKey[] = ['CLOSED', 'ONGOING', 'FINISHED'];

// 信息可信度
export const VERIFY_STATUS = {
  VERIFIED: { label: '官方已核实', cls: 'text-blue-600' },
  UNVERIFIED: { label: '信息待核实，以官方为准', cls: 'text-amber-600' },
} as const;

// 赛事性质
export const EVENT_KIND = {
  PARTICIPATABLE: '可报名',
  VIEWING: '仅观赛',
  REFERENCE: '历史参考',
} as const;

// 订阅类型
export const SUB_TYPE = {
  EVENT_OPEN: '开报名提醒',
  DEADLINE_24H: '截止前1天提醒',
  DEADLINE_72H: '截止前3天提醒',
  NEXT_YEAR: '来年提醒',
  CITY_CATEGORY_NEW: '该品类有新赛提醒',
  CITY_LAUNCH: '城市开通提醒',
} as const;
export type SubTypeKey = keyof typeof SUB_TYPE;

// 投稿/报错/找赛类型（FR-06、FR-07，运营审核队列用）
export const SUBMISSION_TYPE = {
  EVENT_TIP: '赛事投稿',
  CORRECTION: '报错修正',
  FIND_REQUEST: '找赛需求',
} as const;
export type SubmissionTypeKey = keyof typeof SUBMISSION_TYPE;
