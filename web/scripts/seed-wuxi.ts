/**
 * 无锡赛事种子数据导入（网络采集 2026-10-24）
 * ---------------------------------------------------------------
 * 数据来源：最酷报名平台（越野系列赛）、42Cal 赛历、无锡本地宝等公开渠道。
 * 含无锡代管县级市江阴、宜兴的赛事（城市统一归无锡）。
 * 可重复执行（城市+赛事名 幂等）。
 * 运行：在 web/ 目录执行  npm run seed:wuxi
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
    name: '2026 UTO助力首百越野训练赛-无锡惠山站',
    category: '跑步',
    tags: ['越野跑', '训练赛', '惠山'],
    raceDateText: '2026年11月15日（周日）',
    venue: '惠山区·无锡惠山龙泉广场',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/50557',
    registerUrl: 'https://reg.zuicool.com/50557',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026户外特工山顶见训练赛-无锡军嶂古道站',
    category: '跑步',
    tags: ['越野跑', '训练赛', '军嶂古道'],
    raceDateText: '2026年11月22日（周日）',
    venue: '滨湖区·无锡宝界森林公园',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/93060',
    registerUrl: 'https://reg.zuicool.com/93060',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026 UTO助力首百越野训练赛-江阴站',
    category: '跑步',
    tags: ['越野跑', '训练赛', '江阴'],
    raceDateText: '2026年11月29日（周日）',
    venue: '江阴市·南闸观山乐谷',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/37076',
    registerUrl: 'https://reg.zuicool.com/37076',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026无锡走马观湖马山行',
    category: '跑步',
    tags: ['越野跑', '马山'],
    raceDateText: '2026年12月6日（周日）',
    venue: '滨湖区·无锡马山如愿客栈',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/36861',
    registerUrl: 'https://reg.zuicool.com/36861',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026户外特工山顶见训练赛-宜兴问道龙山站',
    category: '跑步',
    tags: ['越野跑', '训练赛', '宜兴'],
    raceDateText: '2026年12月12日（周六）',
    venue: '宜兴市·湖㳇镇洑西村龙山停车场',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/21842',
    registerUrl: 'https://reg.zuicool.com/21842',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026 SALOMON军嶂古道山川行',
    category: '跑步',
    tags: ['越野跑', '军嶂古道'],
    raceDateText: '2026年12月20日（周日）',
    venue: '滨湖区·Yue太湖军嶂古道旅游驿站',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/85654',
    registerUrl: 'https://reg.zuicool.com/85654',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2026 GO野社区赛·惊鸥卷雪',
    category: '跑步',
    tags: ['越野跑', '社区赛', '宝界山'],
    raceDateText: '2026年12月27日（周日）',
    venue: '滨湖区·无锡宝界山林公园',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/22768',
    registerUrl: 'https://reg.zuicool.com/22768',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2027江阴暨阳花山新年越野跑',
    category: '跑步',
    tags: ['越野跑', '新年赛', '江阴'],
    raceDateText: '2027年1月1日（周五）',
    venue: '江阴市·花山滑翔伞基地',
    status: 'OPEN',
    registerGuide: '最酷报名平台一键报名：reg.zuicool.com/88559',
    registerUrl: 'https://reg.zuicool.com/88559',
    verifyStatus: 'UNVERIFIED',
    sourceName: '最酷报名平台',
  },
  {
    name: '2027无锡马拉松',
    category: '跑步',
    tags: ['全马', '半马', '大满贯级', '按赛历明年3月28日'],
    raceDateText: '2027年3月28日（周日，赛历信息待官方确认）',
    venue: '',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide:
      '官网 wuxi.marathon.org.cn 或「汇跑赛事」公众号报名（参考2026届：25万人抽签，中签率2.9%，提前2-3个月开启报名）',
    registerUrl: 'https://wuxi.marathon.org.cn/',
    verifyStatus: 'UNVERIFIED',
    sourceName: '42Cal 赛历 / 无锡市政府网（2026届资料推定）',
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
      city: '无锡',
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
    const existing = await prisma.event.findFirst({ where: { city: '无锡', name: e.name } });
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.event.create({ data });
      inserted++;
    }
  }
  console.log(`[无锡] 新增 ${inserted}，更新 ${updated}，共 ${EVENTS.length} 条种子数据`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('导入失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
