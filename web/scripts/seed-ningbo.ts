/**
 * 宁波赛事种子数据导入（网络采集 2026-10-24）
 * ---------------------------------------------------------------
 * 数据来源：最酷报名平台、浙江马拉松官网、宁波本地宝/央广网等公开渠道。
 * 含余姚（宁波代管市）赛事，城市统一归宁波。
 * 可重复执行（城市+赛事名 幂等）。
 * 运行：在 web/ 目录执行  npm run seed:ningbo
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
    name: '2026余姚四明山登山系列赛（鹿亭站）',
    category: '户外',
    tags: ['登山', '四明山', '余姚'],
    raceDateText: '2026年11月8日（周日）',
    venue: '余姚市·鹿亭乡白鹿村',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/11184',
    registerUrl: 'https://reg.zuicool.com/11184',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026余姚四明山登山系列赛（河姆渡站）',
    category: '户外',
    tags: ['登山', '全民登山大会', '河姆渡'],
    raceDateText: '2026年11月15日（周日）',
    venue: '江北区·河姆渡镇五联村文化礼堂',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/11020',
    registerUrl: 'https://reg.zuicool.com/11020',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026第七届宁波逐野四明·问秋行',
    category: '户外',
    tags: ['越野跑', '两日赛事', '四明山'],
    raceDateText: '2026年11月28-29日',
    venue: '海曙区·海曙龙观半山伴水渡假村',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/14986',
    registerUrl: 'https://reg.zuicool.com/14986',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '中国·余姚2026四明山越野赛',
    category: '跑步',
    tags: ['越野跑', '中登协主办', '两日赛事'],
    raceDateText: '2026年11月29-30日',
    venue: '余姚市·四明山区域',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/14822（中国登山协会主办）',
    registerUrl: 'https://reg.zuicool.com/14822',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2027宁波马拉松',
    category: '跑步',
    tags: ['全马', '半马', '按惯例明年3月中旬'],
    raceDateText: '待官宣（按惯例明年3月中旬开跑）',
    venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide:
      '参考2026届：规模2.7万人（全马1.2万+半马1.5万），报名12月上旬开启，官网/「数字心动」APP 抽签',
    registerUrl: 'https://www.zjim.org/s730559112',
    verifyStatus: 'UNVERIFIED',
    sourceName: '浙江马拉松官网 / 央广网（2026届档期推定）',
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
      city: '宁波',
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
    const existing = await prisma.event.findFirst({ where: { city: '宁波', name: e.name } });
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.event.create({ data });
      inserted++;
    }
  }
  console.log(`[宁波] 新增 ${inserted}，更新 ${updated}，共 ${EVENTS.length} 条种子数据`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('导入失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
