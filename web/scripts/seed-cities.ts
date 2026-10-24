/**
 * 江浙沪剩余 19 城赛事批量种子导入（网络采集 2026-10-24）
 * ---------------------------------------------------------------
 * 数据来源：最酷报名平台（各城市页）、苏州市人民政府/台州政府/中国马拉松等官网。
 * 覆盖：常州/镇江/温州/湖州/绍兴/金华/衢州/舟山/丽水/南通/泰州/宿迁/台州/扬州/盐城/淮安
 *       16 城有赛事；徐州/连云港/嘉兴 公网暂无可确认赛事（留待后续采集）。
 * 可重复执行（城市+赛事名 幂等）。
 * 运行：在 web/ 目录执行  npm run seed:cities
 */
import { prisma } from '../src/lib/prisma';
import { parseRaceDate, parseDeadline } from '../src/lib/parse-date';

interface SeedEvent {
  city: string;
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
  // ---------- 常州 ----------
  { city: '常州', name: '2026 GO野社区赛·苏皖步道跑山赛', category: '户外', tags: ['越野跑', '步道', '溧阳'], raceDateText: '2026年11月29日（周日）', venue: '溧阳市·戴埠镇松岭村松岭部落', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/43539', registerUrl: 'https://reg.zuicool.com/43539', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  // ---------- 镇江 ----------
  { city: '镇江', name: '奔跑江苏2026镇江世业洲乡村健身跑', category: '跑步', tags: ['乡村跑', '健康跑'], raceDateText: '2026年11月1日（周日）', venue: '丹徒区·世业洲', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/93700', registerUrl: 'https://reg.zuicool.com/93700', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '镇江', name: '拓路者2026第八届镇江南山越野赛', category: '跑步', tags: ['越野跑', '两日赛事', '南山'], raceDateText: '2026年12月5-6日', venue: '镇江南山风景区北入口广场（镇江市花鸟市场）', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/93938', registerUrl: 'https://reg.zuicool.com/93938', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  // ---------- 温州 ----------
  { city: '温州', name: '2026 SALOMON GO野社区赛·苍南挑矾古道越野赛', category: '跑步', tags: ['越野跑', '苍南'], raceDateText: '2026年11月8日（周日）', venue: '苍南县·矾山镇溪滨西路171号 温州矾矿锻炉广场', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/41363', registerUrl: 'https://reg.zuicool.com/41363', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '温州', name: '2026玛米高伽·浙南秘境超级山径赛', category: '跑步', tags: ['越野跑', '山径赛', '泰顺'], raceDateText: '2026年11月29日（周日）', venue: '泰顺县·罗阳镇文祥湖公园', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/62735', registerUrl: 'https://reg.zuicool.com/62735', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '温州', name: '2026第二届“山海之径”苍南168黄金海岸线越野挑战赛', category: '跑步', tags: ['越野跑', '海岸线', '两日赛事'], raceDateText: '2026年12月5-6日', venue: '苍南县·渔寮风景区', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/24779', registerUrl: 'https://reg.zuicool.com/24779', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '温州', name: '“环浙步道 山海乐清”2026第二届“山海乐清”徒步大会暨越野赛', category: '户外', tags: ['徒步', '越野赛', '乐清'], raceDateText: '2026年12月6日（周日）', venue: '乐清市·中雁荡山钟前湖大坝（停车场）', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/98568', registerUrl: 'https://reg.zuicool.com/98568', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '温州', name: '2026文成百丈漈越野挑战赛', category: '跑步', tags: ['越野跑', '文成'], raceDateText: '2026年12月27日（周日，自12月13日延期）', venue: '文成县·浙江之翼eVTOL中心', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/21110', registerUrl: 'https://reg.zuicool.com/21110', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '温州', name: '2027楠溪江跑山赛', category: '跑步', tags: ['越野跑', '新年赛', '楠溪江'], raceDateText: '2027年1月2日（周六）', venue: '永嘉县·楠溪江滩地音乐公园', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/45365', registerUrl: 'https://reg.zuicool.com/45365', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  // ---------- 湖州 ----------
  { city: '湖州', name: '2026斯巴达勇士赛-莫干山站', category: '其他综合', tags: ['障碍赛', '斯巴达', '莫干山'], raceDateText: '2026年11月7-8日', venue: '德清县·莫干山国际旅游度假区', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/11858', registerUrl: 'https://reg.zuicool.com/11858', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '湖州', name: '2026第二届SALOMON安吉大溪越野社区赛', category: '跑步', tags: ['越野跑', '社区赛', '安吉'], raceDateText: '2026年11月22日（周日）', venue: '安吉县·天荒坪镇大溪村委', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/78634', registerUrl: 'https://reg.zuicool.com/78634', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '湖州', name: '2026第三届西塞山霞幕雄鹰越野跑', category: '跑步', tags: ['越野跑', '西塞山'], raceDateText: '2026年11月29日（周日）', venue: '吴兴区·湖州西塞臻悦度假酒店', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/14071', registerUrl: 'https://reg.zuicool.com/14071', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '湖州', name: '2026开野越野训练赛·安吉年终站', category: '跑步', tags: ['越野跑', '训练赛', '安吉'], raceDateText: '2026年11月29日（周日）', venue: '安吉县·安吉天使小镇', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/37342', registerUrl: 'https://reg.zuicool.com/37342', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '湖州', name: '2026第三届环黄浦江源自行车骑游大会', category: '骑行', tags: ['骑游大会', '安吉'], raceDateText: '2026年11月29日（周日，自10月25日延期）', venue: '安吉县·黄浦江源国家级射击射箭基地', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/93497', registerUrl: 'https://reg.zuicool.com/93497', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '湖州', name: 'smart汽车2026太湖100·吴越玄冬跑山赛', category: '跑步', tags: ['越野跑', '跑山赛', '长兴'], raceDateText: '2026年12月6日（周日）', venue: '长兴县·长兴龙之梦欢乐世界', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/59636', registerUrl: 'https://reg.zuicool.com/59636', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '湖州', name: '2026 Outopia好野姐妹莫干山冬季赛', category: '跑步', tags: ['越野跑', '女子赛', '莫干山'], raceDateText: '2026年12月13日（周日）', venue: '德清县·阜溪街道莫干山雪乐谷', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/37580', registerUrl: 'https://reg.zuicool.com/37580', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '湖州', name: '2027中国田径协会10公里精英赛（湖州·吴兴）', category: '跑步', tags: ['10公里', '田协精英赛'], raceDateText: '2027年1月3日（周日，自2026年11月22日延期）', venue: '吴兴区·西山漾湿地景区环漾北路', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/32366', registerUrl: 'https://reg.zuicool.com/32366', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  // ---------- 绍兴 ----------
  { city: '绍兴', name: '2026年全国步道联赛暨浙江嵊州“西白云路”山地越野公开赛', category: '跑步', tags: ['越野跑', '步道联赛', '嵊州'], raceDateText: '2026年11月15日（周日）', venue: '嵊州市·小昆村', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/79763', registerUrl: 'https://reg.zuicool.com/79763', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '绍兴', name: '西施100∣2026西施壁湖山径训练赛', category: '跑步', tags: ['越野跑', '训练赛', '诸暨'], raceDateText: '2026年12月13日（周日）', venue: '诸暨市·陈宅镇石壁湖村', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/92636', registerUrl: 'https://reg.zuicool.com/92636', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '绍兴', name: '2027大K探索系列赛|第二届西施壁湖越野挑战赛', category: '跑步', tags: ['越野跑', '挑战赛', '诸暨'], raceDateText: '2027年3月21日（周日）', venue: '诸暨市·陈宅镇', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/32274', registerUrl: 'https://reg.zuicool.com/32274', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  // ---------- 金华 ----------
  { city: '金华', name: '首届“1314的爱”金华山越野赛', category: '跑步', tags: ['越野跑', '金华山'], raceDateText: '2026年11月1日（周日，自10月25日延期）', venue: '婺城区·金华山鹿女湖', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/45872', registerUrl: 'https://reg.zuicool.com/45872', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '金华', name: '2026 UTO助力首百越野训练赛·金华南山站', category: '跑步', tags: ['越野跑', '训练赛', '南山'], raceDateText: '2026年11月29日（周日）', venue: '婺城区·苏孟乡山下村', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/15446', registerUrl: 'https://reg.zuicool.com/15446', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  // ---------- 衢州 ----------
  { city: '衢州', name: '2026开化钱江源半程马拉松', category: '跑步', tags: ['半马', '开化', '钱江源'], raceDateText: '2026年11月22日（周日）', venue: '开化县·根宫佛国文化旅游区北大门', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/26244', registerUrl: 'https://reg.zuicool.com/26244', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  // ---------- 舟山 ----------
  { city: '舟山', name: '2026第五届·1390海岛越野赛', category: '跑步', tags: ['越野跑', '海岛', '两日赛事'], raceDateText: '2026年12月12-13日', venue: '定海区·千岛街道海湾公园内（东侧）市民中心广场', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/80374', registerUrl: 'https://reg.zuicool.com/80374', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  // ---------- 丽水 ----------
  { city: '丽水', name: '2026江浙之巅·千八越野赛', category: '跑步', tags: ['越野跑', '千八', '两日赛事'], raceDateText: '2026年11月7-8日', venue: '龙泉市·屏南越野小镇/望瓯·陶溪川文创街区', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/82108', registerUrl: 'https://reg.zuicool.com/82108', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '丽水', name: '骑遇古堰画乡·2026环丽水·莲都骑游嘉年华', category: '骑行', tags: ['骑游', '古堰画乡'], raceDateText: '2026年11月22日（周日）', venue: '莲都区·南明湖冰雪大世界', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/53566', registerUrl: 'https://reg.zuicool.com/53566', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  { city: '丽水', name: '2026环浙步道系列赛（遂昌站）汤公古道越野赛', category: '跑步', tags: ['越野跑', '汤公古道', '遂昌'], raceDateText: '2026年11月29日（周日）', venue: '遂昌县·水阁高速收费站右侧游客接待中心', status: 'OPEN', registerGuide: '最酷报名平台一键报名：reg.zuicool.com/58485', registerUrl: 'https://reg.zuicool.com/58485', verifyStatus: 'UNVERIFIED', sourceName: '最酷报名平台' },
  // ---------- 南通 ----------
  { city: '南通', name: '2026南通马拉松', category: '跑步', tags: ['全马', '半马'], raceDateText: '2026年11月8日（周日）', venue: '崇川区·南通大剧院', status: 'CLOSED', deadlineText: '报名已于9月1日截止（8月12日开启，超限抽签）', registerGuide: '规模2.5万人（全马7000+半马18000），关注赛事官方渠道候补信息', verifyStatus: 'VERIFIED', sourceName: '中国马拉松 / 南通本地宝' },
  // ---------- 泰州 ----------
  { city: '泰州', name: '2026泰州马拉松', category: '跑步', tags: ['全马', '半马'], raceDateText: '2026年10月25日（周日）', venue: '高港区·泰州体育中心', status: 'CLOSED', registerGuide: '官网 www.taizhoucitymarathon.com 或「泰州马拉松」「善跑体育」公众号', registerUrl: 'http://www.taizhoucitymarathon.com/', verifyStatus: 'VERIFIED', sourceName: '中国马拉松' },
  // ---------- 宿迁 ----------
  { city: '宿迁', name: '2026泗洪马拉松', category: '跑步', tags: ['全马', '半马', '泗洪'], raceDateText: '2026年10月25日（周日）', venue: '泗洪县·城南公园', status: 'CLOSED', registerGuide: '关注中国马拉松官网及赛事官方渠道', verifyStatus: 'VERIFIED', sourceName: '中国马拉松' },
  // ---------- 台州 ----------
  { city: '台州', name: '2026台州马拉松', category: '跑步', tags: ['全马', '半马', '三区联动'], raceDateText: '2026年11月15日（周日）', venue: '椒江区·台州体育中心', status: 'CLOSED', deadlineText: '报名已于9月30日截止（9月15日开启）', registerGuide: '规模12000人（全马4000+半马8000），关注台州体育官方渠道', verifyStatus: 'VERIFIED', sourceName: '台州市政府官网 / 浙江马拉松官网' },
  // ---------- 扬州 ----------
  { city: '扬州', name: '2027扬州鉴真国际半程马拉松', category: '跑步', tags: ['半马', '按惯例明年3月', '田协认证'], raceDateText: '待官宣（按惯例明年3月开跑，2026届为20周年）', venue: '', status: 'PENDING_ANNOUNCEMENT', registerGuide: '参考2026届：1月下旬报名、首日超11万人，官网及官方公众号抽签', verifyStatus: 'UNVERIFIED', sourceName: '扬州市体育局（2026届档期推定）' },
  // ---------- 盐城 ----------
  { city: '盐城', name: '2027盐城马拉松', category: '跑步', tags: ['全马', '半马', '按惯例明年3月底'], raceDateText: '待官宣（按惯例明年3月底开跑）', venue: '', status: 'PENDING_ANNOUNCEMENT', registerGuide: '参考2026届：1月中旬开启报名，官网 jsyc-marathon.com', registerUrl: 'https://www.jsyc-marathon.com/', verifyStatus: 'UNVERIFIED', sourceName: '盐城马拉松官网（2026届档期推定）' },
  // ---------- 淮安 ----------
  { city: '淮安', name: '2027淮安马拉松', category: '跑步', tags: ['全马', '半马', '按惯例明年4月中旬'], raceDateText: '待官宣（按惯例明年4月中旬开跑）', venue: '', status: 'PENDING_ANNOUNCEMENT', registerGuide: '参考2026届：1月21日开启报名，官网 huaian.marathon.org.cn 或「汇跑赛事」公众号', registerUrl: 'https://huaian.marathon.org.cn/', verifyStatus: 'UNVERIFIED', sourceName: '淮安市政府网（2026届档期推定）' },
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
    const existing = await prisma.event.findFirst({ where: { city: e.city, name: e.name } });
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.event.create({ data });
      inserted++;
    }
  }
  console.log(`[19城批量] 新增 ${inserted}，更新 ${updated}，共 ${EVENTS.length} 条种子数据`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('导入失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
