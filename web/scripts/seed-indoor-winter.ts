/**
 * 室内冬季项目补强批次（第二轮全国赛事深挖 2026-10-29）
 * ---------------------------------------------------------------
 * 数据来源：体育总局棋牌中心/武术中心、中国台球协会、中国健美赛事平台、
 * 地方体育局、腾讯赛事官网（2026-10-29 检索核实）。
 * 目标：补强长尾品类（棋牌智力/武术搏击/台球/健美/游泳/电竞）。
 * 可重复执行（城市+赛事名 幂等 upsert）。
 * 纪律：日期/截止保留原文；无法确认的字段留空或标待核实，不臆造；
 *       青少年代表队制赛事标 VIEWING（观赛），赛程未定标 PENDING_ANNOUNCEMENT。
 */
import { prisma } from '../src/lib/prisma';
import { parseRaceDate, parseDeadline } from '../src/lib/parse-date';

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

const SHEET = '室内冬季项目补强 2026-10-29';

const EVENTS: SeedEvent[] = [
  // ================= 棋牌智力（3） =================
  {
    name: '2026广州市围棋甲组联赛', city: '广州', province: '广东', category: '棋牌智力',
    tags: ['围棋', '联赛'], raceDateText: '2026年11月（具体赛程以规程为准）', venue: '广州',
    status: 'OPEN', deadlineText: '第二阶段报名截止11月6日12:00',
    registerGuide: '小程序扫码报名；普通棋手走第二阶段（11月19日起缴费报名）',
    verifyStatus: 'VERIFIED', sourceName: '羊城晚报',
    sourceUrl: 'https://project.ycwb.com.cn/DailyCanvas/details?id=34369',
  },
  {
    name: '第四届“孙子兵法杯”全国业余围棋公开赛', city: '全国', province: '全国', category: '棋牌智力',
    tags: ['围棋', '业余公开赛'], raceDateText: '公开组2026年11月9日至12日（多组别分时段比赛）', venue: '',
    status: 'OPEN',
    registerGuide: '按组别（公开组/45岁以上组/名人组/段位组）分时段参赛，关注主办方报名通知',
    verifyStatus: 'UNVERIFIED', sourceName: '赛事规程（教育宝转载）',
    sourceUrl: 'https://m.jiaoyubao.cn/news/n424258.html',
  },
  {
    name: '2026年中国体育彩票全国象棋民间棋王争霸赛', city: '全国', province: '全国', category: '棋牌智力',
    tags: ['象棋', '民间赛'], raceDateText: '2026年全年（海选赛-省级区域赛-全国总决赛三阶段）', venue: '全国体彩实体店',
    status: 'ONGOING',
    registerGuide: '零门槛参赛：就近在体育彩票实体店参加海选，晋级省级区域赛与全国总决赛',
    verifyStatus: 'VERIFIED', sourceName: '国家体育总局棋牌中心',
    sourceUrl: 'http://www.sport.gov.cn/qpzx/n5387/c29780117/content.html',
  },

  // ================= 武术搏击（2） =================
  {
    name: '2026“少年强”全国跆拳道线上系列赛', city: '全国', province: '全国', category: '武术搏击',
    tags: ['跆拳道', '青少年', '线上赛'], raceDateText: '待核实（线上提交参赛）', venue: '线上',
    status: 'OPEN',
    registerGuide: '7至14周岁青少年均可报名，含竞技品势与创意创作两大赛道，关注体育总局官方渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '国家体育总局',
    sourceUrl: 'http://www.sport.gov.cn/n20001280/n20067662/n20067613/c29722915/content.html',
  },
  {
    name: '2026年杭州市青少年阳光体育武术散打锦标赛', city: '杭州', province: '浙江', category: '武术搏击',
    tags: ['散打', '青少年', '观赛'], raceDateText: '2026年11月20日至22日', venue: '临安锦城二中',
    status: 'UPCOMING',
    registerGuide: '各区县（市）代表队参赛，不开放个人报名；可现场观赛',
    verifyStatus: 'VERIFIED', sourceName: '杭州市体育局',
    sourceUrl: 'https://ty.hangzhou.gov.cn/col/col1228962445/art/2026/art_365e52bf1ee4473299a78fcdb3eec9a0.html',
    kind: 'VIEWING',
  },

  // ================= 其他球类（1，台球） =================
  {
    name: '2026年全国业余台球“王中王”大赛（TNB）', city: '全国', province: '全国', category: '其他球类',
    tags: ['台球', '业余赛'], raceDateText: '待官宣', venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '赛事筹备中，由省级参赛单位/连锁球房组织报名，关注中国台球协会公告',
    verifyStatus: 'VERIFIED', sourceName: '中国台球协会',
    sourceUrl: 'http://www.cbsa.org.cn/#/association/announcementDetails?id=1303',
  },

  // ================= 室内健身（1，健美） =================
  {
    name: '学体联2026年全国大学生健身健美锦标赛', city: '永州', province: '湖南', category: '室内健身',
    tags: ['健身健美', '大学生赛事'], raceDateText: '2026年11月9日至13日', venue: '湖南永州',
    status: 'OPEN',
    registerGuide: '在校大学生通过微信小程序“健美赛事报名”或“健美Plus”在线报名',
    registerUrl: 'https://open.musclegame.cn/events/6aa7bf38d869e49cc0606bf6',
    verifyStatus: 'VERIFIED', sourceName: '中国健美赛事报名官网',
    sourceUrl: 'https://open.musclegame.cn/events/6aa7bf38d869e49cc0606bf6',
  },

  // ================= 水上（1，游泳） =================
  {
    name: '2026泸州青少年游泳赛', city: '泸州', province: '四川', category: '水上',
    tags: ['游泳', '青少年'], raceDateText: '2026年12月（具体日期以官方通知为准）', venue: '泸州',
    status: 'OPEN', deadlineText: '截止12月13日18:00（报满提前关闭）',
    registerGuide: '5-14岁可报：个人电话报名 19081560079，团体发材料至邮箱 3943656671@qq.com',
    verifyStatus: 'UNVERIFIED', sourceName: '看泸州',
    sourceUrl: 'http://m.toutiao.com/group/7701615098904740394/',
  },

  // ================= 电子竞技（3） =================
  {
    name: '2026动感地带校园电竞联赛秋季赛', city: '全国', province: '全国', category: '电子竞技',
    tags: ['电竞', '大学生赛', '线上赛'], raceDateText: '2026年10月下旬至11月中旬（海选与线上决赛），12月初年度总决赛', venue: '线上',
    status: 'OPEN', deadlineText: '各项目海选报名中',
    registerGuide: '面向全国在校大学生免费开放，含王者荣耀/和平精英/无畏契约等五个项目，通过咪咕游戏渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '中国日报网',
    sourceUrl: 'http://cnews.chinadaily.com.cn/a/202609/29/WS6abb3287e4b09a165c78d4ec.html',
  },
  {
    name: '2026王者荣耀全国大赛', city: '全国', province: '全国', category: '电子竞技',
    tags: ['电竞', '全民赛'], raceDateText: '2026年10月2日至11月8日（线上海选阶段，后续赛季制晋级）', venue: '游戏内 + 线下海选点',
    status: 'OPEN', deadlineText: '线上海选截止11月8日',
    registerGuide: '零门槛：游戏内对战-奖励赛-全国大赛入口直接报名参赛',
    verifyStatus: 'VERIFIED', sourceName: '王者荣耀官网',
    sourceUrl: 'http://pvp.qq.com/cp/a20220328qgds/rule.shtml',
  },
  {
    name: '2026年济南市第二届电子竞技运动会', city: '济南', province: '山东', category: '电子竞技',
    tags: ['电竞', '运动会'], raceDateText: '待核实（赛事即将启动）', venue: '济南',
    status: 'OPEN',
    registerGuide: '设全民组/职工组/学生组，王者荣耀/实况足球/第五人格项目，通过赛事官方微信小程序报名',
    verifyStatus: 'VERIFIED', sourceName: '济南市体育局',
    sourceUrl: 'http://jnstyj.jinan.gov.cn/col/col122663/art/2026/art_ba89674d898e4e89b329d2ad30d6e0b7.html',
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
    const existing = await prisma.event.findFirst({ where: { city: e.city, name: e.name } });
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.event.create({ data });
      inserted++;
    }
  }
  console.log(`[室内补强] 新增 ${inserted}，更新 ${updated}，共 ${EVENTS.length} 条种子数据`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('导入失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
