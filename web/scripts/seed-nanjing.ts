/**
 * 南京赛事种子数据导入（网络采集 2026-10-24）
 * ---------------------------------------------------------------
 * 数据来源：南京马拉松官网、高淳马拉松官网、最酷报名平台、南京市体育局/
 * 扬子晚报等公开渠道。可重复执行（城市+赛事名 幂等）。
 * 运行：在 web/ 目录执行  npm run seed:nanjing
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
    name: '2026 UTO助力首百越野训练赛·南京老山站',
    category: '跑步',
    tags: ['越野跑', '训练赛', '老山'],
    raceDateText: '2026年11月15日（周日）',
    venue: '浦口区·老山老母猪沟-猪圈咖啡旁（大堰驿站停车场步行900米）',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/25139',
    registerUrl: 'https://reg.zuicool.com/25139',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026凯乐石FUGA训练赛-南京站（11月）',
    category: '跑步',
    tags: ['越野跑', '训练赛', '紫金山'],
    raceDateText: '2026年11月28日（周六）',
    venue: '紫金·钟爱里街区',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/55087',
    registerUrl: 'https://reg.zuicool.com/55087',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026第四届金陵秋色登山节',
    category: '户外',
    tags: ['登山', '徒步', '两日活动'],
    raceDateText: '2026年11月28-29日',
    venue: '六合区·止马岭森林公园北门',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/94853',
    registerUrl: 'https://reg.zuicool.com/94853',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026南京银行南京马拉松',
    category: '跑步',
    tags: ['全马', '大运河马拉松系列赛', '十周年'],
    raceDateText: '2026年11月22日（周日）',
    venue: '',
    status: 'CLOSED',
    deadlineText: '报名已于8月28日截止，9月16日10:00起可申请候补',
    registerGuide:
      '官网 www.nj-marathon.cn，或「南京马拉松」「汇跑赛事」公众号、「参赛助手」小程序；候补申请自9月16日10:00起',
    registerUrl: 'https://www.nj-marathon.cn',
    verifyStatus: 'VERIFIED',
    sourceName: '南京马拉松官网 / 南京市体育局',
  },
  {
    name: '2026南京高淳马拉松',
    category: '跑步',
    tags: ['全马', '半马', '螃蟹马拉松'],
    raceDateText: '2026年11月8日（周日）',
    venue: '',
    status: 'CLOSED',
    deadlineText: '预报名已于9月21日截止，中签名单9月27日公布',
    registerGuide: '官网 gaochunmarathon.com 报名（全马180元/半马150元，规模12000人）',
    registerUrl: 'http://www.gaochunmarathon.com/',
    verifyStatus: 'VERIFIED',
    sourceName: '高淳马拉松官网',
  },
  {
    name: '2026第八届南京城市定向赛',
    category: '其他综合',
    tags: ['定向赛', '城市探索', '团队赛'],
    raceDateText: '2026年10月24日（周六）',
    venue: '南京国际展览中心北广场',
    status: 'FINISHED',
    registerGuide: '往届通过官方公众号报名，关注下一届',
    verifyStatus: 'VERIFIED',
    sourceName: '扬子晚报网',
  },
  {
    name: '2027南京仙林半程马拉松',
    category: '跑步',
    tags: ['半马', '按惯例明年4月中旬'],
    raceDateText: '待官宣（按惯例明年4月中旬开跑）',
    venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '官网 xlmarathon.com 报名（参考2026届：1月8日开启报名，4月12日开跑）',
    registerUrl: 'https://www.xlmarathon.com/',
    verifyStatus: 'UNVERIFIED',
    sourceName: '仙林半马官网（2026届档期推定）',
  },
  {
    name: '2027南京北岸马拉松',
    category: '跑步',
    tags: ['全马', '半马', '按惯例明年3月'],
    raceDateText: '待官宣（按惯例明年3月开跑）',
    venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '「北岸文旅」微信公众号报名（参考2026届：1月26日开启报名）',
    verifyStatus: 'UNVERIFIED',
    sourceName: '南京本地宝（2026届档期推定）',
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
      city: '南京',
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
    const existing = await prisma.event.findFirst({ where: { city: '南京', name: e.name } });
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.event.create({ data });
      inserted++;
    }
  }
  console.log(`[南京] 新增 ${inserted}，更新 ${updated}，共 ${EVENTS.length} 条种子数据`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('导入失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
