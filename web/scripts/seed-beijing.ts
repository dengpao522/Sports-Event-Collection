/**
 * 北京赛事种子数据导入（全运动类型深挖 2026-10-27）
 * ---------------------------------------------------------------
 * 数据来源：6 批全网深挖（棋类/健美/航模/体育舞蹈/轮滑/毽球跳绳等 15+ 品类），
 * 均经官方/权威渠道核实（北京市体育局、体育总会、各单项协会、赛事官网）。
 * 含仅观赛职业赛 1 场（IEM，kind=VIEWING）。
 * 可重复执行（城市+赛事名 幂等 upsert）。
 * 运行：在 web/ 目录执行  npm run seed:beijing
 * 纪律：日期/截止保留原文；无法确认的字段留空或标待核实，不臆造；
 *       报名状态推断项（系列赛/惯例档期）标 UNVERIFIED。
 */
import { prisma } from '../src/lib/prisma';
import { parseRaceDate, parseDeadline } from '../src/lib/parse-date';

interface SeedEvent {
  name: string;
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

const SHEET = '全运动类型深挖 2026-10-27';
const CITY = '北京';

const EVENTS: SeedEvent[] = [
  // ---- OPEN：当前报名中 ----
  {
    name: '第十八届北京市体育大会棋类大赛',
    category: '棋牌智力',
    tags: ['围棋', '象棋', '国际象棋'],
    raceDateText: '2026年11月（赛期以规程为准）',
    venue: '',
    status: 'OPEN',
    deadlineText: '报名截止11月15日12:00（报满即止）',
    registerGuide: '微信小程序【汇智弈】报名（唯一官方渠道，报满即止）',
    verifyStatus: 'VERIFIED',
    sourceName: '北京市体育总会',
    sourceUrl: 'https://tyj.beijing.gov.cn/bjsports/gzdt84/zwdt/744138391/index.html',
  },
  {
    name: '2026北京TOP羽毛球国际公开赛',
    category: '羽毛球',
    tags: ['国际公开赛'],
    raceDateText: '2026年冬（赛期以规程为准）',
    venue: '',
    status: 'OPEN',
    registerGuide: '关注北京市羽毛球运动协会官网及微信公众号报名（官网10-26官宣火热报名中）',
    verifyStatus: 'VERIFIED',
    sourceName: '北京市羽毛球运动协会',
  },
  {
    name: '星翌体育青少年羽毛球排位赛（11月站）',
    category: '羽毛球',
    tags: ['青少年', '排位赛'],
    raceDateText: '2026年11月第一周（以羽林决赛程为准）',
    venue: '',
    status: 'OPEN',
    registerGuide: '羽林决平台报名',
    registerUrl: 'https://www.yulinjue.com/',
    verifyStatus: 'VERIFIED',
    sourceName: '羽林决',
  },
  {
    name: '乒燃青春杯乒乓球积分赛',
    category: '乒乓球',
    tags: ['积分赛'],
    raceDateText: '2026年11月29日',
    venue: '',
    status: 'OPEN',
    registerGuide: '开球网平台报名',
    registerUrl: 'https://www.kaiqiu.cc',
    verifyStatus: 'VERIFIED',
    sourceName: '开球网',
  },
  {
    name: '2026-2027北京城市副中心3V3篮球系列赛',
    category: '篮球',
    tags: ['3V3', '系列赛', '街道组队'],
    raceDateText: '2026-2027赛季（惯例10月至次年5月）',
    venue: '通州区各街道乡镇',
    status: 'OPEN',
    registerGuide: '通过所在街道/乡镇报名组队（系列赛模式，以通州区当期公告为准）',
    verifyStatus: 'UNVERIFIED',
    sourceName: '通州区系列赛公告',
  },
  {
    name: 'BIIH北京青少年冰球联赛（守门员/候补招募）',
    category: '其他球类',
    tags: ['冰球', '候补', '青少年'],
    raceDateText: '2026-2027赛季（候补招募中）',
    venue: '',
    status: 'OPEN',
    registerGuide: '联系联赛官方申请守门员/候补名额',
    verifyStatus: 'VERIFIED',
    sourceName: 'BIIH北京冰球联赛',
  },
  {
    name: '2026中国·北京朝阳体育舞蹈公开赛',
    category: '其他综合',
    tags: ['体育舞蹈', '国标舞'],
    raceDateText: '2026年11月21日',
    venue: '朝阳体育馆',
    status: 'OPEN',
    deadlineText: '报名截止11月11日',
    registerGuide: '赛事组委会报名（关注赛事官方公告）',
    verifyStatus: 'VERIFIED',
    sourceName: '2026中国·北京朝阳体育舞蹈公开赛组委会',
  },
  {
    name: '2026寰际星耀发卡赛（北京站）',
    category: '室内健身',
    tags: ['健美', '职业卡资格赛'],
    raceDateText: '2026年12月12日',
    venue: '北京市（场馆以赛事公告为准）',
    status: 'OPEN',
    registerGuide:
      '微信小程序「健美赛事报名」或「健美Plus」报名；设男子传统健美/古典健体/健体等7项目，公开组/新秀组/大师组',
    registerUrl: 'https://open.musclegame.cn/events/694ff0cb1e9b3ae633aeb2b5',
    verifyStatus: 'VERIFIED',
    sourceName: '中国健美赛事报名官网',
    sourceUrl: 'https://open.musclegame.cn/events/694ff0cb1e9b3ae633aeb2b5',
  },
  {
    name: '2026寰际中国职业赛（北京站）',
    category: '室内健身',
    tags: ['健美', '职业赛'],
    raceDateText: '2026年12月13日',
    venue: '北京市（场馆以赛事公告为准）',
    status: 'OPEN',
    registerGuide:
      '职业组赛事，需职业参赛资格；大众选手可先参加12月12日寰际星耀发卡赛争夺职业卡',
    registerUrl: 'https://open.musclegame.cn/events/694ff3091e9b3ae633aec6a9',
    verifyStatus: 'VERIFIED',
    sourceName: '中国健美赛事报名官网',
    sourceUrl: 'https://open.musclegame.cn/events/694ff3091e9b3ae633aec6a9',
  },
  {
    name: '全国青少年科技模型网络系列竞赛（第二期）',
    category: '其他综合',
    tags: ['科技体育', '模型', '线上赛', '青少年'],
    raceDateText: '线上赛（第二期作品提交截止11月20日）',
    venue: '线上（全国青少年均可参加）',
    status: 'OPEN',
    deadlineText: '作品提交截止11月20日',
    registerGuide: 'lusie.cn 在线报名并提交参赛作品（需附参赛承诺书）',
    registerUrl: 'https://www.lusie.cn',
    verifyStatus: 'VERIFIED',
    sourceName: '体育总局航管中心',
    sourceUrl: 'http://www.sport.gov.cn/hgzx/n14912/n14914/n14923/c29914875/content.html',
  },
  {
    name: '2026年北京市航海模型公开赛',
    category: '其他综合',
    tags: ['航海模型', '科技体育'],
    raceDateText: '2026年（赛期以规程为准，规程10月22日发布）',
    venue: '',
    status: 'OPEN',
    registerGuide: '北京市模型运动协会官网查看规程/规则并下载报名表报名',
    registerUrl: 'https://bmsamax.org.cn/journalism/list/5/17.html',
    verifyStatus: 'UNVERIFIED',
    sourceName: '北京市模型运动协会',
    sourceUrl: 'https://bmsamax.org.cn/journalism/list/5/17.html',
  },
  {
    name: '全国桥牌通讯系列赛',
    category: '棋牌智力',
    tags: ['桥牌', '每月赛', '公开组'],
    raceDateText: '每月一赛（以中国桥牌网当月公告为准）',
    venue: '',
    status: 'OPEN',
    registerGuide: '中国桥牌网查询当月赛场并报名（线下公开组所有人可报）',
    verifyStatus: 'VERIFIED',
    sourceName: '中国桥牌协会',
  },
  // ---- ONGOING：进行中 ----
  {
    name: '第十八届北京市体育大会轮滑比赛',
    category: '轮滑滑板',
    tags: ['轮滑', '体育大会'],
    raceDateText: '2026年10月11日至10月31日',
    venue: '鸟巢·中国轮滑广场',
    status: 'ONGOING',
    registerGuide: '关注北京市体育总会（单排轮滑球项目10月14日已完赛）',
    verifyStatus: 'VERIFIED',
    sourceName: '北京市体育局/首都之窗',
  },
  // ---- UPCOMING：即将开放报名 ----
  {
    name: '北京市全民健身大赛暨毽球、跳绳邀请赛',
    category: '其他综合',
    tags: ['毽球', '跳绳', '全民健身'],
    raceDateText: '2026年12月19日至12月20日',
    venue: '清华大学附属小学昌平学校',
    status: 'UPCOMING',
    registerGuide: '报名通道即将正式开启，关注北京市体育总会公告',
    verifyStatus: 'VERIFIED',
    sourceName: '北京市体育总会',
    sourceUrl: 'https://www.bjtyzh.org.cn/tizongdongtai/11593.html',
  },
  {
    name: '北京街舞联赛总决赛（2026版）',
    category: '其他综合',
    tags: ['街舞', '总决赛'],
    raceDateText: '2026年12月（预计，以官方为准）',
    venue: '',
    status: 'UPCOMING',
    registerGuide: 'FP街舞赛事系统小程序报名',
    verifyStatus: 'UNVERIFIED',
    sourceName: '北京街舞联赛',
  },
  {
    name: '第十二届冰雪公开赛系列（滑雪登山/攀冰/冰钓/雪垒/成人冰球等）',
    category: '冰雪',
    tags: ['冰雪', '系列赛', '冬季'],
    raceDateText: '2026年12月~2027年1月（预计）',
    venue: '',
    status: 'UPCOMING',
    registerGuide: '冰钓项目承办公告已出，关注北京市社会体育管理中心/北京健身汇小程序',
    verifyStatus: 'UNVERIFIED',
    sourceName: '北京市社会体育管理中心',
  },
  {
    name: '第十八届北京市体育大会空手道比赛',
    category: '武术搏击',
    tags: ['空手道', '体育大会'],
    raceDateText: '2026年12月（预计，以官方为准）',
    venue: '',
    status: 'UPCOMING',
    registerGuide: '关注北京市体育总会公告',
    verifyStatus: 'UNVERIFIED',
    sourceName: '北京市体育总会',
  },
  {
    name: '国际象棋城堡杯等级赛',
    category: '棋牌智力',
    tags: ['国际象棋', '等级赛'],
    raceDateText: '2026年11月29日',
    venue: '石景山区（场馆待确认）',
    status: 'UPCOMING',
    registerGuide: '报名渠道待确认，关注北京国际象棋协会',
    verifyStatus: 'UNVERIFIED',
    sourceName: '北京国际象棋协会',
  },
  {
    name: '北京TOP游泳国际公开赛',
    category: '水上',
    tags: ['游泳', '国际公开赛'],
    raceDateText: '待官宣（筹备中）',
    venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '关注北京市游泳运动协会公告',
    verifyStatus: 'UNVERIFIED',
    sourceName: '北京市游泳运动协会',
  },
  // ---- VIEWING：仅观赛 ----
  {
    name: 'IEM北京2026（CS2国际锦标赛）',
    category: '电子竞技',
    tags: ['CS2', '国际赛事', '观赛'],
    raceDateText: '2026年11月2日至11月8日',
    venue: '五棵松·华熙ECM中心',
    status: 'UPCOMING',
    registerGuide: '16支全球职业战队参赛，不开放大众报名，观众可购票观赛（票务以官方为准）',
    verifyStatus: 'VERIFIED',
    sourceName: 'IEM/ESL官方',
    kind: 'VIEWING',
  },
];

async function main() {
  let inserted = 0;
  let updated = 0;
  for (const e of EVENTS) {
    const race = parseRaceDate(e.raceDateText);
    const deadlineText = e.deadlineText ?? '';
    const data = {
      name: e.name,
      city: CITY,
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
    const existing = await prisma.event.findFirst({ where: { city: CITY, name: e.name } });
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.event.create({ data });
      inserted++;
    }
  }
  console.log(`[北京] 新增 ${inserted}，更新 ${updated}，共 ${EVENTS.length} 条种子数据`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('导入失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
