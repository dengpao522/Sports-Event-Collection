/**
 * 冬季球类/骑行/水上品类补强批次（全国赛事深挖 2026-10-29）
 * ---------------------------------------------------------------
 * 数据来源：体育总局及各协会官网、官方媒体、报名平台（2026-10-29 检索核实）。
 * 目标：补强非跑步品类（羽毛球/乒乓球/网球/足球/骑行/冰雪/水上/轮滑），回填空壳品类页。
 * 可重复执行（城市+赛事名 幂等 upsert）。
 * 纪律：日期/截止保留原文；无法确认的字段留空或标待核实，不臆造；
 *       选拔制/职业赛标 VIEWING（观赛），系列赛待定站标 PENDING_ANNOUNCEMENT。
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

const SHEET = '冬季球类品类补强 2026-10-29';

const EVENTS: SeedEvent[] = [
  // ================= 羽毛球（3） =================
  {
    name: '首届YONEX北京羽毛球公开赛', city: '北京', province: '北京', category: '羽毛球',
    tags: ['羽毛球', '公开赛'], raceDateText: '2026年11月7日至8日', venue: '国家奥林匹克体育中心羽毛球馆',
    status: 'CLOSED', deadlineText: '已于10月23日截止',
    registerGuide: '报名已于10月23日截止；可关注 YONEX 官方微信公众号了解下届信息',
    verifyStatus: 'VERIFIED', sourceName: '中华全国体育总会',
    sourceUrl: 'http://www.sport.org.cn/shouye/qmjs/2026/1017/711820.html',
  },
  {
    name: '2026薰风·金羽羽毛球公开赛（第四站）', city: '深圳', province: '广东', category: '羽毛球',
    tags: ['羽毛球', '公开赛'], raceDateText: '2026年11月14日', venue: '南山区金羽·薰风羽毛球馆',
    status: 'OPEN',
    registerGuide: '通过薰风赛事平台（sports.ymq.me）报名',
    verifyStatus: 'VERIFIED', sourceName: '薰风赛事平台',
    sourceUrl: 'https://sports.ymq.me/',
  },
  {
    name: '黄河流域九省（区）羽毛球邀请赛', city: '银川', province: '宁夏', category: '羽毛球',
    tags: ['羽毛球', '邀请赛'], raceDateText: '2026年11月27日至29日', venue: '宁夏体育馆',
    status: 'OPEN', deadlineText: '截止11月20日12:00',
    registerGuide: '电话报名：杨老师 13909575969 / 回老师 13519501426',
    verifyStatus: 'VERIFIED', sourceName: '银川发布',
    sourceUrl: 'http://m.toutiao.com/group/7702010993936761379/',
  },

  // ================= 乒乓球（4） =================
  {
    name: '第七届“李宁·红双喜杯”全国乒乓球“业余球王”总决赛', city: '全国', province: '全国', category: '乒乓球',
    tags: ['乒乓球', '总决赛'], raceDateText: '待核实（总决赛日期以官方通知为准）', venue: '',
    status: 'OPEN', deadlineText: '截止11月10日16:00',
    registerGuide: '在中国乒乓球协会会员服务中心网站（cttamsc.cn）注册实名后经省级乒协报名',
    registerUrl: 'http://www.cttamsc.cn',
    verifyStatus: 'VERIFIED', sourceName: '中国乒乓球协会',
    sourceUrl: 'http://www.ctta.cn/xhgg/ssxg/2026/1015/711703.html',
  },
  {
    name: '2026“李宁·红双喜杯”中国乒协会员联赛（娄底新化站）', city: '娄底', province: '湖南', category: '乒乓球',
    tags: ['乒乓球', '会员联赛'], raceDateText: '待核实（以官方规程为准）', venue: '娄底市新化县',
    status: 'OPEN', deadlineText: '截止10月30日16:00',
    registerGuide: '在会员服务中心网站（cttamsc.cn）报名，需免费注册中国乒协个人会员',
    registerUrl: 'http://www.cttamsc.cn',
    verifyStatus: 'VERIFIED', sourceName: '中国乒乓球协会',
    sourceUrl: 'http://www.ctta.cn/xhgg/ssxg/2026/1010/711170.html',
  },
  {
    name: '2026乌鲁木齐“红山杯”全民健身公开赛乒乓球赛', city: '乌鲁木齐', province: '新疆', category: '乒乓球',
    tags: ['乒乓球', '全民健身'], raceDateText: '2026年11月28日至29日', venue: '水磨沟区会展中心',
    status: 'OPEN', deadlineText: '截止11月20日18:00',
    registerGuide: '以单位名义组队报名，个人不可单独报名；关注乌鲁木齐市体育部门通知',
    verifyStatus: 'VERIFIED', sourceName: '乌鲁木齐本地宝（转官方通知）',
    sourceUrl: 'http://wlmq.bendibao.com/xiuxian/20261027/69126.shtm',
  },
  {
    name: '第二届全国全民健身大赛乒乓球总决赛', city: '青岛', province: '山东', category: '乒乓球',
    tags: ['乒乓球', '总决赛', '观赛'], raceDateText: '2026年11月9日至11日', venue: '城阳体育馆',
    status: 'UPCOMING',
    registerGuide: '参赛队伍经七大赛区选拔产生，不开放大众报名；可现场观赛',
    verifyStatus: 'VERIFIED', sourceName: '城阳区融媒体中心',
    sourceUrl: 'http://m.toutiao.com/group/7702011334691242511/',
    kind: 'VIEWING',
  },

  // ================= 网球（3） =================
  {
    name: '2026中国大众网球城市挑战赛全国总决赛', city: '北京', province: '北京', category: '网球',
    tags: ['网球', '总决赛'], raceDateText: '2026年11月26日至29日', venue: '朝阳区国家网球中心',
    status: 'OPEN',
    registerGuide: '关注中国网球协会官网及官方渠道报名',
    verifyStatus: 'VERIFIED', sourceName: '中国网球协会',
    sourceUrl: 'https://www.tennis.org.cn/notice/competition/2026/1027/712933.html',
  },
  {
    name: '2026 ITF世界网球巡回赛马鞍山站（M15）', city: '马鞍山', province: '安徽', category: '网球',
    tags: ['网球', '国际赛事', '观赛'], raceDateText: '2026年11月9日至15日', venue: '',
    status: 'UPCOMING',
    registerGuide: '职业巡回赛，不开放大众报名，可现场观赛',
    verifyStatus: 'VERIFIED', sourceName: 'ITF国际网球联合会',
    sourceUrl: 'https://www.itftennis.com/en/tournament/m15-maanshan/chn/2026/m-itf-chn-2026-035/fact-sheet/',
    kind: 'VIEWING',
  },
  {
    name: '第五届中国网球协会社区运动会全国总决赛（中国村网·京山）', city: '荆门', province: '湖北', category: '网球',
    tags: ['网球', '社区运动会'], raceDateText: '待核实（总决赛日期以官方通知为准）', venue: '湖北京山',
    status: 'CLOSED', deadlineText: '报名已于10月22日截止',
    registerGuide: '报名已截止，可关注中国网球协会官网了解下届信息',
    verifyStatus: 'VERIFIED', sourceName: '中国网球协会',
    sourceUrl: 'https://www.tennis.org.cn/notice/competition/2026/0930/710396.html',
  },

  // ================= 骑行（4） =================
  {
    name: '2026中国自行车爬坡挑战赛·玉溪龙马山站', city: '玉溪', province: '云南', category: '骑行',
    tags: ['自行车', '爬坡赛'], raceDateText: '2026年11月29日', venue: '玉溪市高原体育运动中心',
    status: 'OPEN', deadlineText: '截止11月20日',
    registerGuide: '通过野途网等报名平台报名',
    verifyStatus: 'VERIFIED', sourceName: '野途网',
    sourceUrl: 'http://wildto.com/event/',
  },
  {
    name: 'UCI Gran Fondo 世界系列赛海南站（临高-儋州公路赛）', city: '儋州', province: '海南', category: '骑行',
    tags: ['自行车', '国际赛事', 'GranFondo'], raceDateText: '2026年12月11日', venue: '临高-儋州赛段',
    status: 'OPEN', deadlineText: '早鸟价截止11月10日',
    registerGuide: '通过赛事官网报名（分早鸟/标准/临期三档收费）',
    registerUrl: 'https://ucigranfondo.cn/',
    verifyStatus: 'VERIFIED', sourceName: 'UCI Gran Fondo 海南站官网',
    sourceUrl: 'https://ucigranfondo.cn/',
  },
  {
    name: '2026浙江省山地自行车联赛（兰溪站）', city: '金华', province: '浙江', category: '骑行',
    tags: ['山地车', '联赛'], raceDateText: '2026年11月21日至22日', venue: '兰溪',
    status: 'OPEN',
    registerGuide: '通过 51bike 等骑行报名平台报名',
    verifyStatus: 'VERIFIED', sourceName: '51bike报名平台',
    sourceUrl: 'https://shop.51bike.com/h5/index#/pages/match/match-list',
  },
  {
    name: '2026中国自行车运动骑游大会（山系列）郎溪县第六届山地自行车赛', city: '宣城', province: '安徽', category: '骑行',
    tags: ['山地车', '骑游大会'], raceDateText: '2026年11月（具体日期以规程为准）', venue: '郎溪县新和旅游度假区',
    status: 'OPEN', deadlineText: '截止11月6日',
    registerGuide: '通过野途网等报名平台报名',
    verifyStatus: 'UNVERIFIED', sourceName: '野途网',
    sourceUrl: 'https://www.wildto.com/event/11606.html',
  },

  // ================= 足球（3） =================
  {
    name: '2026年百队杯精英联赛（十一人制）', city: '北京', province: '北京', category: '足球',
    tags: ['足球', '青少年', '联赛'], raceDateText: '2026年10月25日至12月（联赛赛制，轮次以官方为准）', venue: '',
    status: 'ONGOING',
    registerGuide: '联赛进行中，关注北京市足协官方网站获取赛程与下届报名信息',
    verifyStatus: 'VERIFIED', sourceName: '北京市足球协会',
    sourceUrl: 'http://www.bfaweb.cn/m/index.php?c=article&id=1700',
  },
  {
    name: '2026年南京市足协超级联赛', city: '南京', province: '江苏', category: '足球',
    tags: ['足球', '城市联赛'], raceDateText: '2026年11月7日开赛', venue: '',
    status: 'OPEN', deadlineText: '截止10月30日17:00',
    registerGuide: '以各区足协为单位组队，由区足协汇总统一报名（不接受球队直接报名）',
    verifyStatus: 'VERIFIED', sourceName: '南京本地宝（转市足协通知）',
    sourceUrl: 'https://m.nj.bendibao.com/news/183673.shtm',
  },
  {
    name: '2026年连云港市城市足球联赛', city: '连云港', province: '江苏', category: '足球',
    tags: ['足球', '城市联赛'], raceDateText: '2026年11月开赛（主客场联赛）', venue: '',
    status: 'CLOSED', deadlineText: '报名已于10月25日截止',
    registerGuide: '报名已截止，可关注连云港市体育局公告观赛或参与下届',
    verifyStatus: 'VERIFIED', sourceName: '搜狐体育（转官方）',
    sourceUrl: 'https://sports.sohu.com/a/1082851868_121106832',
  },

  // ================= 冰雪（3） =================
  {
    name: '2026-2027全国单板滑雪平行项目U系列（武汉站）', city: '武汉', province: '湖北', category: '冰雪',
    tags: ['单板', 'U系列赛'], raceDateText: '2026年11月1日至3日', venue: '武汉热雪奇迹滑雪场',
    status: 'CLOSED', deadlineText: '开赛前9日已截止',
    registerGuide: '报名已截止（“滑cool”小程序报名）；可现场观赛，后续站次关注体育总局冬运中心公告',
    verifyStatus: 'VERIFIED', sourceName: '国家体育总局',
    sourceUrl: 'http://www.sport.gov.cn/dyzx/n5169/c29899630/content.html',
  },
  {
    name: '2026-2027全国单板滑雪平行项目U系列（阿勒泰站·待定）', city: '阿勒泰', province: '新疆', category: '冰雪',
    tags: ['单板', 'U系列赛'], raceDateText: '2026年11月19日至22日（待定）', venue: '将军山滑雪场',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '站点待定，通过“滑cool”小程序关注报名开启',
    verifyStatus: 'VERIFIED', sourceName: '国家体育总局',
    sourceUrl: 'http://www.sport.gov.cn/dyzx/n5169/c29899630/content.html',
  },
  {
    name: '第十届南山双板公开赛', city: '北京', province: '北京', category: '冰雪',
    tags: ['双板', '自由式'], raceDateText: '2026-2027雪季（日期待官宣）', venue: '密云南山滑雪场麦罗公园',
    status: 'PENDING_ANNOUNCEMENT',
    registerGuide: '关注南山滑雪场官网/公众号报名',
    verifyStatus: 'VERIFIED', sourceName: '南山滑雪场官网',
    sourceUrl: 'https://www.nanshanski.com/newsinfo/10941256.html',
  },

  // ================= 水上（1） =================
  {
    name: '2026“HLA POW澜跑”中国全民健身走（跑）大赛（江阴·飞马水城站）', city: '无锡', province: '江苏', category: '水上',
    tags: ['龙舟体验', '健步走'], raceDateText: '2026年11月7日', venue: '江阴市新桥镇飞马水城',
    status: 'OPEN', deadlineText: '截止10月31日（或报满即止）',
    registerGuide: '通过官方服务平台“毅行体育”公众号报名',
    verifyStatus: 'VERIFIED', sourceName: '国家体育总局社体中心',
    sourceUrl: 'http://www.sport.gov.cn/stzx/n5434/c30051829/content.html',
  },

  // ================= 轮滑滑板（1） =================
  {
    name: '2026年全国大学生轮滑锦标赛', city: '青岛', province: '山东', category: '轮滑滑板',
    tags: ['速度轮滑', '自由式轮滑', '观赛'], raceDateText: '2026年11月4日至9日', venue: '城阳青春国际轮滑场',
    status: 'UPCOMING',
    registerGuide: '高校赛事，经中国学生体育联合会体系参赛；现场观赛免费开放（以场馆安排为准）',
    verifyStatus: 'VERIFIED', sourceName: '城阳区融媒体中心',
    sourceUrl: 'http://m.toutiao.com/group/7702011334691242511/',
    kind: 'VIEWING',
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
  console.log(`[品类补强] 新增 ${inserted}，更新 ${updated}，共 ${EVENTS.length} 条种子数据`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('导入失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
