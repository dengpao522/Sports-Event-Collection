/**
 * 苏州赛事种子数据导入（网络采集 2026-10-24）
 * ---------------------------------------------------------------
 * 数据来源：最酷报名平台、苏州市人民政府官网、中国马拉松、苏州本地宝等公开渠道。
 * 可重复执行（城市+赛事名 幂等）。
 * 运行：在 web/ 目录执行  npm run seed:suzhou
 * 纪律：日期/截止保留原文；无法确认的字段留空或标待核实，不臆造。
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
}

const SHEET = '网络采集 2026-10-24';

const EVENTS: SeedEvent[] = [
  {
    name: 'BIGK·2026苏州100城市越野赛',
    category: '跑步',
    tags: ['越野跑', '两日赛事', '太湖'],
    raceDateText: '2026年11月21-22日',
    venue: '吴中区·孙武文化园',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/61197',
    registerUrl: 'https://reg.zuicool.com/61197',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: 'BIGK·2026兵圣故里·秋阅江南亲子欢乐跑',
    category: '跑步',
    tags: ['亲子跑', '欢乐跑'],
    raceDateText: '2026年11月22日（周日）',
    venue: '吴中区·孙武文化园',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/26369',
    registerUrl: 'https://reg.zuicool.com/26369',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026 XTERRA太湖越野挑战赛',
    category: '跑步',
    tags: ['越野跑', '世界系列赛', '两日赛事'],
    raceDateText: '2026年12月5-6日',
    venue: '吴中区·中国（吴中）太湖洞庭山碧螺春茶文化园大草坪（近水月禅寺）',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/35355',
    registerUrl: 'https://reg.zuicool.com/35355',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026第九届太湖登山节（穹窿山）',
    category: '户外',
    tags: ['登山', '徒步', '太湖群山'],
    raceDateText: '2026年10月17日（周六）',
    venue: '吴中区·苏州穹窿山风景区北大门',
    status: 'FINISHED',
    registerGuide: '关注最酷报名平台下一届报名',
    registerUrl: 'https://reg.zuicool.com/74251',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026中国田径协会10公里精英赛（苏州·漕湖）',
    category: '跑步',
    tags: ['10公里', '田协精英赛'],
    raceDateText: '2026年9月27日（周日）',
    venue: '相城区·漕湖湿地公园',
    status: 'FINISHED',
    registerGuide: '国家级路跑系列赛 IP，下一届关注苏州市体育局发布',
    verifyStatus: 'VERIFIED',
    sourceName: '苏州市人民政府官网',
  },
  {
    name: '2027苏州环金鸡湖半程马拉松',
    category: '跑步',
    tags: ['半马', '按惯例明年3月'],
    raceDateText: '待官宣（按惯例明年3月开跑）',
    venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '苏州最大规模半马 IP（参考2026届：3月开跑，报名提前约2个月开启）',
    verifyStatus: 'UNVERIFIED',
    sourceName: '苏州本地宝（2026届档期推定）',
  },
  {
    name: '2027苏州太湖数字半程马拉松',
    category: '跑步',
    tags: ['半马', '按惯例明年3月底'],
    raceDateText: '待官宣（按惯例明年3月底开跑）',
    venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '参考2026届：1月8日开启报名，3月29日开跑，规模5000人抽签',
    verifyStatus: 'UNVERIFIED',
    sourceName: '中国马拉松（2026届档期推定）',
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
      city: '苏州',
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
      kind: 'PARTICIPATABLE',
      dataOrigin: 'MANUAL_COLLECTION',
      sourceName: e.sourceName,
      sourceSheet: SHEET,
      isPublished: true,
    };
    const existing = await prisma.event.findFirst({ where: { city: '苏州', name: e.name } });
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.event.create({ data });
      inserted++;
    }
  }
  console.log(`[苏州] 新增 ${inserted}，更新 ${updated}，共 ${EVENTS.length} 条种子数据`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('导入失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
