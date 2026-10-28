/**
 * 全国赛事深挖数据入库（全国赛事深挖 2026-10-28）
 * ---------------------------------------------------------------
 * 数据来源：全网深挖的全国范围赛事（跑步/越野/户外/骑行/铁三/水上/冰雪/球类/其他综合），
 * 覆盖除北京本地大众赛以外全国各地（北京已与此前批次去重，仅保留国际级/全国总决赛类）。
 * 含仅观赛职业赛（kind=VIEWING）若干场。
 * 可重复执行（城市+赛事名 幂等 upsert）。
 * 运行：在 web/ 目录执行  npm run seed:national
 * 纪律：日期/截止保留原文；无法确认的字段留空或标待核实，不臆造；
 *       系列赛/惯例档期/网络转载未核实项标 UNVERIFIED。
 * 注意：parseRaceDate 对含排除词（待官宣/待定/待核实/赛季/下旬等）或无“日”字的文本
 *       恒返回 { start: null, end: null }，原文完整保留在 raceDateText 用于前端展示。
 */
import { prisma } from '../src/lib/prisma';
import { parseRaceDate, parseDeadline } from '../src/lib/parse-date';

/** 全国版种子条目：比北京版多必填 city（地级市/省域/全国）与 province */
interface SeedEvent {
  name: string;
  city: string;
  province: string;
  category: string;
  tags: string[];
  raceDateText: string;
  venue: string;
  status: string;
  deadlineText?: string;
  registerGuide: string;
  registerUrl?: string;
  verifyStatus: 'VERIFIED' | 'UNVERIFIED';
  sourceName: string;
  sourceUrl?: string;
  kind?: 'PARTICIPATABLE' | 'VIEWING' | 'REFERENCE';
}

const SHEET = '全国赛事深挖 2026-10-28';

const EVENTS: SeedEvent[] = [
  // ================= 跑步（33） =================
  {
    name: '2026杭州马拉松', city: '杭州', province: '浙江', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年11月1日', venue: '',
    status: 'CLOSED',
    registerGuide: '报名已截止，可关注杭州马拉松官方渠道了解下届信息',
    verifyStatus: 'VERIFIED', sourceName: '杭州马拉松官方',
  },
  {
    name: '2026西昌邛海湿地马拉松', city: '西昌', province: '四川', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年11月7日', venue: '邛海湿地',
    status: 'CLOSED',
    registerGuide: '报名已截止，关注赛事官方公众号了解详情',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026南昌马拉松', city: '南昌', province: '江西', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年11月15日', venue: '',
    status: 'CLOSED',
    registerGuide: '报名已截止，关注南昌马拉松官方渠道',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026南京马拉松', city: '南京', province: '江苏', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年11月22日', venue: '',
    status: 'CLOSED',
    registerGuide: '报名已截止，关注南京马拉松官方渠道',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026武夷山马拉松', city: '南平', province: '福建', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年11月22日', venue: '',
    status: 'OPEN', deadlineText: '截止10月31日',
    registerGuide: '通过赛事官方报名渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026海南东方半程马拉松', city: '东方', province: '海南', category: '跑步',
    tags: ['马拉松', '半程'], raceDateText: '2026年11月22日', venue: '',
    status: 'FIRST_COME', deadlineText: '额满即止',
    registerGuide: '名额有限，报满即止，尽快通过官方渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026千岛湖马拉松', city: '杭州', province: '浙江', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年11月29日', venue: '千岛湖·淳安',
    status: 'CLOSED',
    registerGuide: '报名已截止，关注千岛湖马拉松官方渠道',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026深圳马拉松', city: '深圳', province: '广东', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年12月6日', venue: '',
    status: 'CLOSED',
    registerGuide: '报名已截止，关注深圳马拉松官方渠道',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026长江三峡马拉松（忠县）', city: '重庆', province: '重庆', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年12月6日', venue: '忠县',
    status: 'OPEN',
    registerGuide: '通过赛事官方报名渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026广州马拉松', city: '广州', province: '广东', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年12月20日', venue: '',
    status: 'CLOSED',
    registerGuide: '报名已截止，关注广州马拉松官方渠道',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026儋州马拉松', city: '儋州', province: '海南', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年12月20日', venue: '',
    status: 'OPEN', deadlineText: '截止10月30日',
    registerGuide: '通过赛事官方报名渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: 'WSE跑步节珠海10K', city: '珠海', province: '广东', category: '跑步',
    tags: ['10K', '路跑'], raceDateText: '2026年12月20日', venue: '',
    status: 'OPEN', deadlineText: '截止11月20日',
    registerGuide: '通过WSE跑步节官方渠道报名',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026福州马拉松', city: '福州', province: '福建', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年12月27日', venue: '',
    status: 'CLOSED',
    registerGuide: '报名已截止，关注福州马拉松官方渠道',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026海口马拉松', city: '海口', province: '海南', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年12月27日', venue: '',
    status: 'OPEN',
    registerGuide: '报名已开启（10月28日已开放报名），通过赛事官方渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026横琴马拉松', city: '珠海', province: '广东', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年12月27日', venue: '横琴',
    status: 'CLOSED',
    registerGuide: '报名已截止，关注横琴马拉松官方渠道',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026江油迎新跑', city: '江油', province: '四川', category: '跑步',
    tags: ['迎新跑', '路跑'], raceDateText: '2026年12月31日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2027上海F1迎新半马', city: '上海', province: '上海', category: '跑步',
    tags: ['半程', '迎新跑'], raceDateText: '2027年1月1日', venue: '',
    status: 'OPEN', deadlineText: '截止12月5日',
    registerGuide: '通过赛事官方报名渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '中国田协10K精英赛湖州站', city: '湖州', province: '浙江', category: '跑步',
    tags: ['10K', '精英赛'], raceDateText: '2027年1月3日', venue: '',
    status: 'OPEN',
    registerGuide: '通过中国田径协会/赛事官方报名渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '中国田径协会',
  },
  {
    name: '2027顺德容桂马拉松', city: '佛山', province: '广东', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2027年1月3日', venue: '',
    status: 'CLOSED',
    registerGuide: '报名已截止，关注赛事官方渠道',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2027厦门马拉松', city: '厦门', province: '福建', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2027年1月10日', venue: '',
    status: 'CLOSED', deadlineText: '候补至12月25日',
    registerGuide: '正赛报名已截止，候补通道开放至12月25日',
    verifyStatus: 'VERIFIED', sourceName: '厦门马拉松官方',
  },
  {
    name: '2027重庆马拉松', city: '重庆', province: '重庆', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2027年1月10日', venue: '',
    status: 'CLOSED',
    registerGuide: '报名已截止，关注重庆马拉松官方渠道',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2027普洱思茅马拉松', city: '普洱', province: '云南', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2027年1月10日', venue: '',
    status: 'OPEN', deadlineText: '截止11月30日',
    registerGuide: '通过赛事官方报名渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2027长春冰雪马拉松', city: '长春', province: '吉林', category: '跑步',
    tags: ['马拉松', '冰雪'], raceDateText: '2027年2月21日', venue: '',
    status: 'OPEN', deadlineText: '截止1月20日',
    registerGuide: '通过赛事官方报名渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026广安马拉松', city: '广安', province: '四川', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年11月（具体日期待定）', venue: '',
    status: 'OPEN', deadlineText: '截止11月8日',
    registerGuide: '通过赛事官方报名渠道报名，比赛日期以官方最终公告为准',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: 'Keep超跑节上海站', city: '上海', province: '上海', category: '跑步',
    tags: ['路跑', '城市赛'], raceDateText: '2026年11月22日', venue: '',
    status: 'OPEN', deadlineText: '截止11月2日',
    registerGuide: '通过Keep官方渠道报名',
    verifyStatus: 'VERIFIED', sourceName: 'Keep官方',
  },
  {
    name: '2026天津亲子长跑', city: '天津', province: '天津', category: '跑步',
    tags: ['亲子', '路跑'], raceDateText: '2026年11月22日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '跑遍中国线上赛哈尔滨站', city: '全国', province: '全国', category: '跑步',
    tags: ['线上赛', '路跑'], raceDateText: '2026年11月5日', venue: '线上',
    status: 'OPEN',
    registerGuide: '线上赛，通过“跑遍中国”官方平台报名参赛',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2027吉祥吉林迎新跑', city: '长春', province: '吉林', category: '跑步',
    tags: ['迎新跑', '路跑'], raceDateText: '2027年1月1日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026河源万绿湖马拉松', city: '河源', province: '广东', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '2026年12月27日', venue: '万绿湖',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '运满满10K长沙站', city: '长沙', province: '湖南', category: '跑步',
    tags: ['10K', '路跑'], raceDateText: '2026年11月8日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026漠河冰雪马拉松', city: '漠河', province: '黑龙江', category: '跑步',
    tags: ['马拉松', '冰雪'], raceDateText: '待官宣（参照往届11月上旬）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注漠河官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2027深圳大鹏新年马拉松', city: '深圳', province: '广东', category: '跑步',
    tags: ['马拉松', '迎新跑'], raceDateText: '待官宣（往届元旦）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注大鹏新年马拉松官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2027罗平花海马拉松', city: '曲靖', province: '云南', category: '跑步',
    tags: ['马拉松', '路跑'], raceDateText: '待官宣（往届2月下旬）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注罗平马拉松官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },

  // ================= 越野跑山（33） =================
  {
    name: '2026千八越野跑龙泉站', city: '丽水', province: '浙江', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年11月7日', venue: '',
    status: 'OPEN', deadlineText: '截止10月31日',
    registerGuide: '通过赛事官方报名渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026富川古明城越野赛', city: '贺州', province: '广西', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年11月8日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026泰山跑山赛', city: '泰安', province: '山东', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年11月8日', venue: '泰山',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026甘泉红色越野赛', city: '延安', province: '陕西', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年11月1日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026金华山越野赛（延期）', city: '金华', province: '浙江', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年11月1日（原定，已延期）', venue: '金华山',
    status: 'POSTPONED',
    registerGuide: '赛事已延期，新日期以官方公告为准',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026齐鲁名山越野赛', city: '山东', province: '山东', category: '越野跑山',
    tags: ['越野', '系列赛'], raceDateText: '2026年11月15日', venue: '',
    status: 'UPCOMING',
    registerGuide: '系列赛多站举办，报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026丝路山水超级越野赛崇州', city: '成都', province: '四川', category: '越野跑山',
    tags: ['越野', '超级越野'], raceDateText: '2026年11月15日', venue: '崇州',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: 'WSE越野赛苏州站', city: '苏州', province: '江苏', category: '越野跑山',
    tags: ['越野', '城市赛'], raceDateText: '2026年11月21日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注WSE官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026漓江越野赛', city: '桂林', province: '广西', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年11月21日至22日', venue: '漓江',
    status: 'CLOSED',
    registerGuide: '报名已满，报名通道关闭',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026四明山问秋越野赛', city: '宁波', province: '浙江', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年11月28日', venue: '余姚四明山',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026井冈山越野赛', city: '井冈山', province: '江西', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年11月28日至29日', venue: '井冈山',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026汤公古道越野赛遂昌', city: '丽水', province: '浙江', category: '越野跑山',
    tags: ['越野', '古道'], raceDateText: '2026年11月29日', venue: '遂昌',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026桐庐生仙里越野赛', city: '杭州', province: '浙江', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年11月29日', venue: '桐庐生仙里',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026万峰林喀斯特越野赛', city: '兴义', province: '贵州', category: '越野跑山',
    tags: ['越野', '喀斯特'], raceDateText: '2026年12月4日至6日', venue: '万峰林',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '阳朔100越野赛', city: '桂林', province: '广西', category: '越野跑山',
    tags: ['越野', '百公里'], raceDateText: '2026年内（报名已截止抽签）', venue: '阳朔',
    status: 'CLOSED',
    registerGuide: '报名已截止，采取抽签制，中签结果以官方通知为准',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026镇江南山越野赛', city: '镇江', province: '江苏', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年12月5日至6日', venue: '南山',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026长白山林海雪原越野赛', city: '白山', province: '吉林', category: '越野跑山',
    tags: ['越野', '冰雪'], raceDateText: '2026年12月6日', venue: '长白山',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '太湖100越野赛·玄冬站', city: '无锡', province: '江苏', category: '越野跑山',
    tags: ['越野', '百公里'], raceDateText: '2026年12月6日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告（城市归属以官方为准）',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026中国山地马拉松系列赛从化站', city: '广州', province: '广东', category: '越野跑山',
    tags: ['越野', '山地马拉松'], raceDateText: '2026年12月6日', venue: '从化区',
    status: 'UPCOMING',
    registerGuide: '中国登山协会系列赛，报名暂未开启或即将开启，关注官方公告',
    verifyStatus: 'VERIFIED', sourceName: '中国登山协会',
  },
  {
    name: 'WSE越野赛西安站', city: '西安', province: '陕西', category: '越野跑山',
    tags: ['越野', '城市赛'], raceDateText: '2026年12月5日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注WSE官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026雁荡山四尖越野赛', city: '温州', province: '浙江', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年12月12日', venue: '乐清',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026深圳坪山40越野赛', city: '深圳', province: '广东', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年12月12日', venue: '坪山',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026宜兴龙山越野赛', city: '无锡', province: '江苏', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年12月12日', venue: '宜兴',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026军嶂古道越野赛', city: '无锡', province: '江苏', category: '越野跑山',
    tags: ['越野', '古道'], raceDateText: '2026年11月22日', venue: '军嶂古道',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026南京老山跑山赛', city: '南京', province: '江苏', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年12月12日', venue: '老山',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026莫干山冬季越野赛', city: '湖州', province: '浙江', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年12月13日', venue: '德清',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026“山顶见”越野总决赛彭州', city: '成都', province: '四川', category: '越野跑山',
    tags: ['越野', '总决赛'], raceDateText: '2026年12月13日', venue: '彭州',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026安吉大溪越野赛', city: '湖州', province: '浙江', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年11月22日', venue: '安吉大溪',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026富春雪岭越野赛', city: '杭州', province: '浙江', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年12月20日', venue: '富阳',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026金秀大瑶山越野赛', city: '来宾', province: '广西', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2026年12月27日', venue: '金秀县',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2027楠溪江跑山赛', city: '温州', province: '浙江', category: '越野跑山',
    tags: ['越野', '跑山'], raceDateText: '2027年1月2日', venue: '永嘉',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2027勐海茶山越野赛', city: '西双版纳', province: '云南', category: '越野跑山',
    tags: ['越野', '茶山'], raceDateText: '2027年1月2日', venue: '勐海县',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2027广州100越野赛', city: '广州', province: '广东', category: '越野跑山',
    tags: ['越野', '百公里'], raceDateText: '2027年1月15日至17日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },

  // ================= 户外（5） =================
  {
    name: '全国攀岩馆联赛总决赛', city: '全国', province: '全国', category: '户外',
    tags: ['攀岩', '总决赛'], raceDateText: '2026年12月（待官宣）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注中国登山协会公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026阳朔攀岩节', city: '桂林', province: '广西', category: '户外',
    tags: ['攀岩', '攀岩节'], raceDateText: '待官宣', venue: '阳朔',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注阳朔攀岩节官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2027全国新年登高健身大会', city: '全国', province: '全国', category: '户外',
    tags: ['登高', '全民健身'], raceDateText: '待官宣（元旦档全国多地）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '元旦档全国多地同步举办，关注各地体育部门公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026“双11”全国持杖行走日', city: '全国', province: '全国', category: '户外',
    tags: ['持杖行走', '全民健身'], raceDateText: '2026年11月11日', venue: '',
    status: 'UPCOMING',
    registerGuide: '全国多地联动开展，关注中国登山协会/各地体育部门公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026斯巴达勇士赛莫干山站', city: '湖州', province: '浙江', category: '户外',
    tags: ['障碍赛', '斯巴达'], raceDateText: '2026年11月7日至8日', venue: '莫干山',
    status: 'OPEN',
    registerGuide: '通过斯巴达勇士赛官方渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '斯巴达勇士赛官方',
  },

  // ================= 骑行（9） =================
  {
    name: '2026郎溪山地自行车赛', city: '宣城', province: '安徽', category: '骑行',
    tags: ['山地车', '自行车'], raceDateText: '2026年11月22日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026环茶马古道雅安国际公路自行车赛', city: '雅安', province: '四川', category: '骑行',
    tags: ['公路车', '国际赛事'], raceDateText: '2026年11月22日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026环漓江自行车骑游大会', city: '桂林', province: '广西', category: '骑行',
    tags: ['骑游', '自行车'], raceDateText: '2026年11月22日', venue: '漓江',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026玉溪龙马山自行车爬坡赛', city: '玉溪', province: '云南', category: '骑行',
    tags: ['山地车', '爬坡赛'], raceDateText: '2026年11月29日', venue: '龙马山',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026广州增城骑游大会', city: '广州', province: '广东', category: '骑行',
    tags: ['骑游', '自行车'], raceDateText: '2026年11月29日', venue: '增城',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026福建自行车联赛总决赛仙游', city: '莆田', province: '福建', category: '骑行',
    tags: ['自行车', '总决赛'], raceDateText: '2026年12月6日', venue: '仙游',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026UCI格兰芬多海南站', city: '海南', province: '海南', category: '骑行',
    tags: ['公路车', '国际赛事'], raceDateText: '2026年12月11日至13日', venue: '',
    status: 'OPEN', deadlineText: '截止12月9日',
    registerGuide: '通过格兰芬多系列赛官方渠道报名',
    verifyStatus: 'VERIFIED', sourceName: 'UCI格兰芬多官方',
  },
  {
    name: '2026海南跨年骑行活动', city: '海南', province: '海南', category: '骑行',
    tags: ['骑游', '跨年'], raceDateText: '2026年12月30日至2027年1月3日', venue: '',
    status: 'FIRST_COME', deadlineText: '满员即止',
    registerGuide: '名额有限，满员即止，尽快通过官方渠道报名',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026七彩云南格兰芬多自行车节', city: '云南', province: '云南', category: '骑行',
    tags: ['公路车', '自行车节'], raceDateText: '待官宣（官方已预告11月开赛）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '官方已预告11月开赛，具体赛程关注格兰芬多官方公告',
    verifyStatus: 'VERIFIED', sourceName: '格兰芬多官方',
  },

  // ================= 铁人三项（2） =================
  {
    name: '2026Challenge Xiamen厦门铁三', city: '厦门', province: '福建', category: '铁人三项',
    tags: ['铁三', '国际赛事'], raceDateText: '2026年11月7日至8日', venue: '',
    status: 'CLOSED',
    registerGuide: '报名已截止，关注Challenge Xiamen官方渠道',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026-2027全国冬季铁三系列赛', city: '哈尔滨', province: '黑龙江', category: '铁人三项',
    tags: ['冬季铁三', '系列赛'], raceDateText: '待官宣（12月底至2027年1月）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注中国铁人三项运动协会公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },

  // ================= 水上（8） =================
  {
    name: '2026全国游泳城市系列赛沈阳站', city: '沈阳', province: '辽宁', category: '水上',
    tags: ['游泳', '系列赛'], raceDateText: '2026年11月7日至8日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026世界泳联“游泳日”中国站（12城联动）', city: '全国', province: '全国', category: '水上',
    tags: ['游泳', '国际赛事'], raceDateText: '2026年11月21日', venue: '',
    status: 'UPCOMING',
    registerGuide: '12城联动开展，关注世界泳联/各承办城市公告',
    verifyStatus: 'VERIFIED', sourceName: '世界泳联',
  },
  {
    name: '2026全国游泳俱乐部锦标赛成都', city: '成都', province: '四川', category: '水上',
    tags: ['游泳', '锦标赛'], raceDateText: '2026年11月21日至22日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026全国游泳城市系列赛青岛站', city: '青岛', province: '山东', category: '水上',
    tags: ['游泳', '系列赛'], raceDateText: '2026年12月12日至13日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026查干湖冬泳挑战', city: '松原', province: '吉林', category: '水上',
    tags: ['冬泳', '冰雪'], raceDateText: '待官宣（12月中下旬）', venue: '查干湖',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注查干湖冬泳官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026宜昌冬渡长江', city: '宜昌', province: '湖北', category: '水上',
    tags: ['冬泳', '横渡'], raceDateText: '待官宣（12月上旬）', venue: '长江宜昌段',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注宜昌冬泳协会公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2027哈尔滨国际冬泳邀请赛', city: '哈尔滨', province: '黑龙江', category: '水上',
    tags: ['冬泳', '国际赛事'], raceDateText: '待官宣（2027年1月上旬）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注哈尔滨冬泳协会公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026世界短池游泳锦标赛（北京水立方）', city: '北京', province: '北京', category: '水上',
    tags: ['游泳', '国际赛事', '观赛'], raceDateText: '2026年12月1日至6日', venue: '水立方',
    status: 'UPCOMING',
    registerGuide: '国际顶级赛事，不开放大众报名，观众可购票观赛（票务以官方为准）',
    verifyStatus: 'VERIFIED', sourceName: '世界泳联',
    kind: 'VIEWING',
  },

  // ================= 冰雪（18） =================
  {
    name: '2027长春净月潭瓦萨国际滑雪节', city: '长春', province: '吉林', category: '冰雪',
    tags: ['越野滑雪', '国际赛事'], raceDateText: '2027年1月4日', venue: '净月潭',
    status: 'OPEN',
    registerGuide: '通过瓦萨滑雪节官方渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2026广州单板大跳台冬令营', city: '广州', province: '广东', category: '冰雪',
    tags: ['单板', '冬令营'], raceDateText: '2026年11月15日至29日', venue: '',
    status: 'OPEN', deadlineText: '截止11月8日',
    registerGuide: '通过主办方官方渠道报名',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026-2027全国单板及自由式滑雪U系列赛第六站（崇礼富龙）', city: '张家口', province: '河北', category: '冰雪',
    tags: ['单板', 'U系列赛'], raceDateText: '2026年12月21日至24日', venue: '崇礼富龙',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注中国滑雪协会公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026-2027全国单板及自由式滑雪U系列赛第七站（崇礼富龙）', city: '张家口', province: '河北', category: '冰雪',
    tags: ['单板', 'U系列赛'], raceDateText: '2027年1月21日至24日', venue: '崇礼富龙',
    status: 'UPCOMING',
    registerGuide: '通过滑cool小程序报名',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2027世界大学生冬季运动会（长春）', city: '长春', province: '吉林', category: '冰雪',
    tags: ['国际赛事', '综合运动会', '观赛'], raceDateText: '2027年1月15日至25日', venue: '',
    status: 'UPCOMING',
    registerGuide: '国际综合性赛事，不开放大众报名，观众可通过官方渠道观赛',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
    kind: 'VIEWING',
  },
  {
    name: '2026国际滑联花滑大奖赛总决赛', city: '重庆', province: '重庆', category: '冰雪',
    tags: ['花样滑冰', '国际赛事', '观赛'], raceDateText: '2026年12月11日至13日', venue: '',
    status: 'UPCOMING',
    registerGuide: '国际顶级赛事，不开放大众报名，观众可购票观赛（票务以官方为准）',
    verifyStatus: 'VERIFIED', sourceName: '国际滑联',
    kind: 'VIEWING',
  },
  {
    name: '2026国际滑联速滑世界杯北京站', city: '北京', province: '北京', category: '冰雪',
    tags: ['速度滑冰', '国际赛事', '观赛'], raceDateText: '2026年11月13日至15日', venue: '',
    status: 'UPCOMING',
    registerGuide: '国际顶级赛事，不开放大众报名，观众可购票观赛（票务以官方为准）',
    verifyStatus: 'VERIFIED', sourceName: '国际滑联',
    kind: 'VIEWING',
  },
  {
    name: '2027国际滑联速滑世锦赛（北京）', city: '北京', province: '北京', category: '冰雪',
    tags: ['速度滑冰', '国际赛事', '观赛'], raceDateText: '2027年2月下旬', venue: '',
    status: 'UPCOMING',
    registerGuide: '国际顶级赛事，不开放大众报名，观众可购票观赛（票务以官方为准）',
    verifyStatus: 'VERIFIED', sourceName: '国际滑联',
    kind: 'VIEWING',
  },
  {
    name: '2026-2027全国速滑精英联赛', city: '全国', province: '全国', category: '冰雪',
    tags: ['速度滑冰', '系列赛', '观赛'], raceDateText: '2026-2027赛季（进行中）', venue: '',
    status: 'ONGOING',
    registerGuide: '赛事正在进行中，可通过中国滑冰协会官方渠道了解赛程',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
    kind: 'VIEWING',
  },
  {
    name: '第十三届全国大众冰雪季', city: '全国', province: '全国', category: '冰雪',
    tags: ['冰雪', '全民健身'], raceDateText: '待官宣（12月前后）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注国家体育总局公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '“雪耀中国”全民滑雪系列赛', city: '全国', province: '全国', category: '冰雪',
    tags: ['滑雪', '系列赛'], raceDateText: '待官宣', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注主办方官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '万龙Salomon滑雪追逐杯', city: '张家口', province: '河北', category: '冰雪',
    tags: ['滑雪', '追逐赛'], raceDateText: '待官宣（2027年1-2月）', venue: '崇礼万龙',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注万龙滑雪场公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '全国大众室外速度滑冰挑战赛', city: '全国', province: '全国', category: '冰雪',
    tags: ['速度滑冰', '大众赛'], raceDateText: '待官宣', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注中国滑冰协会公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '全国城市越野滑雪（滑轮）挑战赛', city: '全国', province: '全国', category: '冰雪',
    tags: ['越野滑雪', '滑轮'], raceDateText: '待官宣（2027年1-2月）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注中国滑雪协会公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '全国大众滑雪技术达标赛', city: '全国', province: '全国', category: '冰雪',
    tags: ['滑雪', '达标赛'], raceDateText: '待官宣', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注中国滑雪协会公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '哈尔滨国际冰雪节2027', city: '哈尔滨', province: '黑龙江', category: '冰雪',
    tags: ['冰雪', '节庆活动', '观赛'], raceDateText: '待官宣（2027年1月5日开幕惯例）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '按惯例2027年1月5日开幕，关注哈尔滨官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
    kind: 'VIEWING',
  },
  {
    name: '2026内蒙古冬季那达慕', city: '内蒙古', province: '内蒙古', category: '冰雪',
    tags: ['那达慕', '民俗体育', '观赛'], raceDateText: '待官宣（12月下旬）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注内蒙古自治区体育部门公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
    kind: 'VIEWING',
  },
  {
    name: '2026-2027滑雪登山冬令营', city: '全国', province: '全国', category: '冰雪',
    tags: ['滑雪登山', '冬令营'], raceDateText: '待官宣', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '尚未官宣，关注中国登山协会公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },

  // ================= 排球（2） =================
  {
    name: '2026全国气排球公开赛总决赛（婺源）', city: '上饶', province: '江西', category: '排球',
    tags: ['气排球', '总决赛'], raceDateText: '2026年11月14日至15日', venue: '婺源',
    status: 'OPEN', deadlineText: '截止11月6日',
    registerGuide: '通过赛事官方报名渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
  },
  {
    name: '2027新疆雪地排球邀请赛', city: '新疆', province: '新疆', category: '排球',
    tags: ['雪地排球', '邀请赛'], raceDateText: '待官宣（2027年1月）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注新疆排球协会公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },

  // ================= 乒乓球（1） =================
  {
    name: '2026中国乒协会员联赛新化站', city: '娄底', province: '湖南', category: '乒乓球',
    tags: ['乒乓球', '会员联赛'], raceDateText: '2026年11月6日至8日', venue: '新化',
    status: 'OPEN', deadlineText: '截止10月30日',
    registerGuide: '通过中国乒协会员联赛官方渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '中国乒乓球协会',
  },

  // ================= 羽毛球（4） =================
  {
    name: '2026全国业余羽毛球“球王”总决赛（重庆）', city: '重庆', province: '重庆', category: '羽毛球',
    tags: ['羽毛球', '总决赛'], raceDateText: '2026年11月19日至22日', venue: '',
    status: 'OPEN', deadlineText: '截止11月10日',
    registerGuide: '通过赛事官方报名渠道报名',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026抚顺羽毛球挑战赛', city: '抚顺', province: '辽宁', category: '羽毛球',
    tags: ['羽毛球', '挑战赛'], raceDateText: '2026年11月21日至22日', venue: '',
    status: 'OPEN',
    registerGuide: '通过赛事官方报名渠道报名',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026全国羽毛球“东西南北中”总决赛（深圳）', city: '深圳', province: '广东', category: '羽毛球',
    tags: ['羽毛球', '总决赛'], raceDateText: '2026年12月4日至6日', venue: '',
    status: 'OPEN',
    registerGuide: '通过中国羽毛球协会官方渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '中国羽毛球协会',
  },
  {
    name: '2026全国羽毛球大众系列赛MT1000温州站', city: '温州', province: '浙江', category: '羽毛球',
    tags: ['羽毛球', '大众赛'], raceDateText: '2026年11月9日至13日', venue: '',
    status: 'OPEN', deadlineText: '截止11月7日',
    registerGuide: '通过赛事官方报名渠道报名',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },

  // ================= 足球（3） =================
  {
    name: '2026中冠联赛总决赛', city: '全国', province: '全国', category: '足球',
    tags: ['足球', '总决赛', '观赛'], raceDateText: '2026年11月（收官阶段）', venue: '',
    status: 'UPCOMING',
    registerGuide: '职业联赛，不开放大众报名，观众可通过官方渠道观赛',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
    kind: 'VIEWING',
  },
  {
    name: '2027“村超”春节档', city: '黔东南', province: '贵州', category: '足球',
    tags: ['足球', '村超', '观赛'], raceDateText: '待官宣（2027年春节档）', venue: '榕江县',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注榕江村超官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
    kind: 'VIEWING',
  },
  {
    name: '2027阳江贺岁杯足球赛', city: '阳江', province: '广东', category: '足球',
    tags: ['足球', '贺岁杯', '观赛'], raceDateText: '待官宣（2027年2月）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注阳江当地体育部门公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
    kind: 'VIEWING',
  },

  // ================= 篮球（3） =================
  {
    name: '全国和美乡村篮球大赛（村BA）北部赛区', city: '双鸭山', province: '黑龙江', category: '篮球',
    tags: ['篮球', '村BA', '观赛'], raceDateText: '2026年10月起（已开赛）', venue: '宝清县',
    status: 'ONGOING',
    registerGuide: '赛事正在进行中，可通过官方渠道了解赛程',
    verifyStatus: 'VERIFIED', sourceName: '赛事官方公告',
    kind: 'VIEWING',
  },
  {
    name: '2027村BA春节档', city: '黔东南', province: '贵州', category: '篮球',
    tags: ['篮球', '村BA', '观赛'], raceDateText: '待官宣', venue: '台江县',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注台江村BA官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
    kind: 'VIEWING',
  },
  {
    name: '2026-2027赛季CBA联赛', city: '全国', province: '全国', category: '篮球',
    tags: ['篮球', 'CBA', '观赛'], raceDateText: '2026-2027赛季（进行中）', venue: '',
    status: 'ONGOING',
    registerGuide: '职业联赛，不开放大众报名，观众可购票观赛（票务以官方为准）',
    verifyStatus: 'VERIFIED', sourceName: 'CBA联赛官方',
    kind: 'VIEWING',
  },

  // ================= 其他球类（2） =================
  {
    name: '2026全国门球锦标赛总决赛', city: '全国', province: '全国', category: '其他球类',
    tags: ['门球', '总决赛'], raceDateText: '待官宣（11月）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注中国门球协会公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026全国台球四项全国赛', city: '全国', province: '全国', category: '其他球类',
    tags: ['台球', '全国赛'], raceDateText: '待官宣（12月）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注中国台球协会公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },

  // ================= 其他综合（7） =================
  {
    name: '2027全国农民村字号系列赛事（村BA/村跑/村舞/村乒/村钓）', city: '全国', province: '全国', category: '其他综合',
    tags: ['村字号', '系列赛', '全民健身'], raceDateText: '待官宣（2027年全年）', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事尚未官宣，关注农业农村部门/体育总局公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026全国躲避飞盘公开赛（广州）', city: '广州', province: '广东', category: '其他综合',
    tags: ['飞盘', '躲避盘'], raceDateText: '2026年11月14日至15日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026全国腰旗橄榄球总决赛（厦门）', city: '厦门', province: '福建', category: '其他综合',
    tags: ['腰旗橄榄球', '总决赛'], raceDateText: '2026年11月6日至8日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026全国腰旗橄榄球赛重庆站', city: '重庆', province: '重庆', category: '其他综合',
    tags: ['腰旗橄榄球', '分站赛'], raceDateText: '2026年12月5日至6日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026全国无线电测向公开赛（无锡）', city: '无锡', province: '江苏', category: '其他综合',
    tags: ['无线电测向', '科技体育'], raceDateText: '2026年11月13日至15日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026全国无线电测向锦标赛（赣州）', city: '赣州', province: '江西', category: '其他综合',
    tags: ['无线电测向', '锦标赛'], raceDateText: '2026年11月23日至30日', venue: '',
    status: 'UPCOMING',
    registerGuide: '报名暂未开启或即将开启，关注赛事官方公告',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
  {
    name: '2026全国男子飞盘公开赛（慈溪）', city: '宁波', province: '浙江', category: '其他综合',
    tags: ['飞盘', '公开赛'], raceDateText: '待核实', venue: '',
    status: 'UNVERIFIED',
    registerGuide: '信息待核实，请以官方渠道为准',
    verifyStatus: 'UNVERIFIED', sourceName: '网络公开信息整理',
  },
];

async function main() {
  let inserted = 0;
  let updated = 0;
  for (const e of EVENTS) {
    // 日期解析：解析失败时 race.start/race.end 均为 null，原文保留在 raceDateText
    const race = parseRaceDate(e.raceDateText);
    const deadlineText = e.deadlineText ?? '';
    const data = {
      name: e.name,
      city: e.city,
      province: e.province,
      category: e.category,
      tags: JSON.stringify(e.tags),
      raceDateText: e.raceDateText,
      raceDateStart: race.start,
      raceDateEnd: race.end,
      venue: e.venue,
      status: e.status,
      deadlineText,
      deadlineAt: deadlineText ? parseDeadline(deadlineText) : null,
      registerGuide: e.registerGuide,
      registerUrl: e.registerUrl ?? '',
      verifyStatus: e.verifyStatus,
      verifiedAt: e.verifyStatus === 'VERIFIED' ? new Date() : null,
      kind: e.kind ?? 'PARTICIPATABLE',
      dataOrigin: 'MANUAL_COLLECTION',
      sourceName: e.sourceName,
      sourceUrl: e.sourceUrl ?? '',
      sourceSheet: SHEET,
      isPublished: true,
    };
    // 幂等：同一（城市+赛事名）只保留一条，重复执行即更新
    const existing = await prisma.event.findFirst({ where: { city: e.city, name: e.name } });
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.event.create({ data });
      inserted++;
    }
  }
  console.log(`[全国] 新增 ${inserted}，更新 ${updated}，共 ${EVENTS.length} 条种子数据`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('导入失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
