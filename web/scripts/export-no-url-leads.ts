/**
 * 补链线索导出工具：把无报名直链的可报名赛事按「报名方式文字中的平台线索」分类，
 * 导出 CSV 工作清单供运营人工核补 registerUrl（补完后可重跑本脚本看剩余）。
 *
 * 运行：npx tsx scripts/export-no-url-leads.ts
 * 输出：项目根目录《补采线索-无直链赛事.csv》（UTF-8 BOM，Excel 直接打开不乱码）
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { prisma } from '../src/lib/prisma';

/** 有网页版报名页的平台：报名方式提到即可去平台搜赛事名补直链 */
const PLATFORMS: Array<{ label: string; keywords: string[] }> = [
  { label: '最酷', keywords: ['最酷', 'zuicool'] },
  { label: '汇跑', keywords: ['汇跑', 'huipao'] },
  { label: '马拉马拉', keywords: ['马拉马拉'] },
  { label: '爱燃烧', keywords: ['爱燃烧', 'iranshao'] },
  { label: '悦跑圈', keywords: ['悦跑圈', '悦跑'] },
  { label: '咕咚', keywords: ['咕咚'] },
  { label: 'Keep', keywords: ['keep'] },
  { label: '数字心动', keywords: ['数字心动'] },
  { label: '42旅', keywords: ['42旅'] },
  { label: 'HelloRun', keywords: ['hellorun'] },
  { label: '跑步维生素', keywords: ['维生素'] },
  { label: '全民马拉松', keywords: ['全民马拉松'] },
];

/** 归类：先按状态分流待官宣，再按名称+报名方式中的文字线索分级 */
function classify(name: string, guide: string, status: string): { bucket: string; hint: string } {
  // 待官宣赛事本身没有报名入口，置底暂缓（补链无意义）
  if (status === 'PENDING_ANNOUNCEMENT') {
    return { bucket: '待官宣（暂缓）', hint: '等官宣后再补' };
  }
  // 平台/官网线索扫描范围：报名方式文字 + 赛事名（赛事名含平台名也算线索）
  const text = `${guide} ${name}`.toLowerCase();
  for (const p of PLATFORMS) {
    if (p.keywords.some((k) => text.includes(k.toLowerCase()))) {
      return { bucket: '平台线索', hint: `去${p.label}搜赛事名找报名页` };
    }
  }
  // 官网/APP/平台类文字线索（宽松匹配，人工核对成本低于漏掉）
  if (['官网', '官方网站', 'app', '平台', '网'].some((k) => text.includes(k))) {
    return { bucket: '官网·APP线索', hint: '按名称搜官网/APP 找报名页' };
  }
  if (['公众号', '小程序', '微信'].some((k) => guide.includes(k))) {
    return { bucket: '微信渠道', hint: '无网页直链，保持复制引导' };
  }
  return { bucket: '其他', hint: '按赛事名搜索报名页，找不到则保持现状' };
}

async function main() {
  // 可报名状态（与前台口径一致）且无直链的赛事
  const registrable = ['OPEN', 'FIRST_COME', 'UPCOMING', 'PENDING_ANNOUNCEMENT'];
  const events = await prisma.event.findMany({
    where: { kind: 'PARTICIPATABLE', status: { in: registrable }, registerUrl: '' },
    select: { id: true, name: true, city: true, raceDateText: true, registerGuide: true, status: true },
  });

  // 桶名 → CSV 优先级（数字越小越优先处理）
  const PRIORITY: Record<string, string> = {
    平台线索: '1',
    '官网·APP线索': '2',
    其他: '3',
    微信渠道: '4',
    '待官宣（暂缓）': '5',
  };

  // 分类并生成 CSV 行（字段顺序：优先级/分类/城市/赛事名/比赛日期/报名方式原文/补链建议/id）
  const rows = events.map((e) => {
    const { bucket, hint } = classify(e.name, e.registerGuide ?? '', e.status);
    // CSV 字段内引号转义（报名方式文字可能含『』以外的英文双引号）
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const priority = PRIORITY[bucket] ?? '3';
    return [
      priority,
      bucket,
      esc(e.city),
      esc(e.name),
      esc(e.raceDateText),
      esc(e.registerGuide),
      esc(hint),
      e.id,
    ].join(',');
  });
  // 按行首"优先级,分类,城市"字典序升序排，确保清单顶部是最好动手的
  rows.sort((a, b) => a.localeCompare(b, 'zh'));

  const header = '优先级,分类,城市,赛事名,比赛日期,报名方式原文,补链建议,赛事ID';
  // UTF-8 BOM 前缀：保证 Excel 双击打开中文不乱码
  const csv = '\uFEFF' + [header, ...rows].join('\r\n');
  const outPath = join(process.cwd(), '..', '补采线索-无直链赛事.csv');
  writeFileSync(outPath, csv, 'utf8');

  // 控制台统计摘要
  const byBucket = new Map<string, number>();
  for (const e of events) {
    const { bucket } = classify(e.name, e.registerGuide ?? '', e.status);
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + 1);
  }
  console.log(`无直链可报名赛事: ${events.length} 场，已导出: ${outPath}`);
  for (const [bucket, n] of [...byBucket.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${bucket}: ${n} 场`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
