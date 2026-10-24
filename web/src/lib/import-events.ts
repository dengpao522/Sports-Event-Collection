/**
 * 赛事清单 Excel 解析与入库（FR-08 ② 批量导入核心模块）
 * ---------------------------------------------------------------
 * 同一套逻辑服务两个入口：
 *  - scripts/import-xlsx.ts（npm run import 命令行批量导入）
 *  - /admin/import 页（运营后台上传 xlsx 即时导入）
 *
 * 设计原则（与 PRD 数据纪律一致）：
 *  1. 按“表头名称模糊匹配”定位列，兼容不同工作表的列结构差异；
 *  2. 无法确认的信息保留原文，不臆造；
 *  3. 幂等：以 城市+赛事名 为键，存在则更新，不产生重复赛事；
 *  4. 赛事表导入 Event；“品类空窗总览”导入 GapReason；“档期规律”等非赛事表跳过。
 */
import * as XLSX from 'xlsx';
import { prisma } from './prisma';
import { classifyCategory } from './classify';
import { parseRaceDate, parseDeadline } from './parse-date';

type Row = Record<string, unknown>;

/** 单个文件导入结果报告 */
export interface FileReport {
  city: string;
  /** 新增赛事数 */
  inserted: number;
  /** 幂等更新赛事数 */
  updated: number;
  /** 写入的品类空窗说明数 */
  gap: number;
  /** 跳过的空行数 */
  skipped: number;
}

// ---------- 工具：从一行（对象）中按表头关键词取值 ----------
function pick(row: Row, keys: Array<RegExp | string>): string {
  for (const target of keys) {
    for (const head of Object.keys(row)) {
      const h = head.replace(/\s/g, '');
      const hit = typeof target === 'string' ? h.includes(target) : target.test(h);
      if (hit) {
        const v = row[head];
        if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
      }
    }
  }
  return '';
}

// ---------- 报名状态推断 ----------
function inferStatus(raw: string, ctx: { kind: string }): string {
  const t = raw;
  if (/延期|取消/.test(t)) return 'POSTPONED';
  if (/待官宣|未官宣|待公布|尚未官宣|春季预告|秋季档.*待公布|按惯例/.test(t)) return 'PENDING_ANNOUNCEMENT';
  if (/报满即止|额满即止|报完即止|先到先得/.test(t)) return 'FIRST_COME';
  if (/即将开报|即将报名|报名待开|倒计时/.test(t)) return 'UPCOMING';
  if (/刚收官|已收官|刚结束|已结束|已办/.test(t)) return 'FINISHED';
  if (/已截止|截止.*已|报名已结束/.test(t)) return 'CLOSED';
  if (/报名中|报名进行|报名已开启|已开启|已开放|进行中|团体报名|线上虚拟赛已开放/.test(t)) return 'OPEN';
  if (/需核实|待核实/.test(t)) return 'UNVERIFIED';
  // 无状态文本时：历史/观赛类不参与报名列表，置 FINISHED；可报名赛事置待核实，避免错误展示“报名中”
  if (ctx.kind === 'REFERENCE' || ctx.kind === 'VIEWING') return 'FINISHED';
  return 'UNVERIFIED';
}

// ---------- 赛事性质（可报名/观赛/历史参考）推断 ----------
function inferKind(sheetName: string, typeCell: string, guide: string): string {
  // 独立的“已截止参考”工作表 → 历史参考
  if (/已截止/.test(sheetName)) return 'REFERENCE';
  if (/观赛/.test(sheetName)) {
    // 类型列明确标注“参赛”（如“羽毛球·参赛”“壁球·参赛”）→ 可报名
    if (/参赛/.test(typeCell) && !/观赛/.test(typeCell)) return 'PARTICIPATABLE';
    // 已截止/刚收官的旗舰赛 → 历史参考（引导订阅来年）
    if (/已截止|刚收官|已结束/.test(typeCell)) return 'REFERENCE';
    // 观赛/购票类 → 仅观赛
    if (/观赛|购票|票务|大麦|猫眼/.test(`${typeCell} ${guide}`)) return 'VIEWING';
    // 其余待官宣/春季预告默认按“可报名（待官宣）”处理，如林丹杯、苏河半马
    return 'PARTICIPATABLE';
  }
  return 'PARTICIPATABLE';
}

// ---------- 从指引文本提取可点击链接 ----------
function extractUrl(text: string): string {
  const m = text.match(/https?:\/\/[^\s，。；;）)]+/i);
  if (m) return m[0];
  // 裸域名（如 runthetrack.com、shang-ma.com、zjim.org）
  const d = text.match(/(?<![\w.@])([a-z0-9-]+\.)+(com|cn|org|net|cc)(\/[^\s，。；;）)]*)?/i);
  if (d) return `https://${d[0]}`;
  return '';
}

/**
 * 清洗“报名截止”原文：
 * 源表该列有时被填成纯状态词（如“报名中”“需核实”），并非截止时间。
 * 含具体时间信息（数字、月、旬）则保留；纯状态短语返回空串，避免详情页出现“报名截止：报名中”的矛盾。
 */
function cleanDeadline(raw: string): string {
  const t = (raw || '').trim();
  if (!t) return '';
  if (/[0-9０-９]|月|旬/.test(t)) return t;
  if (/报名|核实|进行|截止|开启|开放|额满|即止|关注|跟踪/.test(t)) return '';
  return t;
}

// 工作表分类
type SheetType = 'events' | 'gap' | 'skip';
function sheetKind(name: string): SheetType {
  if (/空窗/.test(name)) return 'gap';
  if (/档期|规律/.test(name)) return 'skip';
  return 'events';
}

/**
 * 导入一个城市的 xlsx 内容（内存二进制，不落临时文件）
 * @param city 本清单归属城市（导入数据统一打到该城市）
 * @param buffer xlsx 文件二进制
 */
export async function importWorkbook(city: string, buffer: ArrayBuffer): Promise<FileReport> {
  const report: FileReport = { city, inserted: 0, updated: 0, gap: 0, skipped: 0 };
  const wb = XLSX.read(buffer, { cellDates: false });

  for (const sheetName of wb.SheetNames) {
    const kind0 = sheetKind(sheetName);
    if (kind0 === 'skip') continue;
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: '' });
    if (!rows.length) continue;

    // ---- 品类空窗总览 → GapReason ----
    if (kind0 === 'gap') {
      for (const row of rows) {
        const catRaw = pick(row, ['品类']);
        const situation = pick(row, [/可报情况/, /窗口内情况/]);
        const note = pick(row, ['说明']);
        if (!catRaw) continue;
        const { category } = classifyCategory(catRaw);
        await prisma.gapReason.upsert({
          where: { city_category: { city, category } },
          update: { reason: situation, seasonNote: note },
          create: { city, category, reason: situation, seasonNote: note },
        });
        report.gap++;
      }
      continue;
    }

    // ---- 赛事表 ----
    for (const row of rows) {
      const name = pick(row, [/赛事名称/, /^名称$/]).replace(/\s+/g, ' ');
      if (!name) {
        report.skipped++;
        continue;
      }
      const catRaw = pick(row, ['品类', '类型', '类别']);
      const dateText = pick(row, [/比赛日期/, /^时间$/, /日期/]);
      const venue = pick(row, [/^地点/, /地点\/平台/, /平台/]);
      const deadlineTextRaw = pick(row, [/报名截止/, /^截止/]);
      const deadlineText = cleanDeadline(deadlineTextRaw);
      const statusCell = pick(row, [/报名状态/, /^状态$/]);
      const guide = pick(row, [/报名.*指引/, /报名方式/, /参与方式/, /备注/, /^说明$/]);
      const typeCell = pick(row, ['类型']); // 观赛表的“类型”列（可能含品类+观赛/参赛）

      const kind = inferKind(sheetName, typeCell, guide);
      const status = inferStatus(`${statusCell} ${deadlineText}`, { kind });

      // 品类：优先用品类列；观赛表类型列形如“羽毛球·观赛”时取·前片段；都没有则从名称推断
      const catSource = catRaw && !/^观赛|^已截止|^刚收官|^春季预告|^待官宣/.test(catRaw) ? catRaw : typeCell.split(/[·・]/)[0] || name;
      const { category, tags } = classifyCategory(catSource);

      const { start, end } = parseRaceDate(dateText);
      const deadline = parseDeadline(`${deadlineText} ${guide}`);

      // 可信度：任一字段含“需核实/待核实”，或状态为 UNVERIFIED → UNVERIFIED
      const verify =
        /需核实|待核实/.test(`${dateText}${deadlineText}${statusCell}${guide}`) || status === 'UNVERIFIED'
          ? 'UNVERIFIED'
          : 'VERIFIED';

      const url = extractUrl(guide);

      const data = {
        name,
        city,
        category,
        tags: JSON.stringify(tags),
        raceDateText: dateText || '时间待定',
        raceDateStart: start,
        raceDateEnd: end,
        venue,
        status,
        deadlineText,
        deadlineAt: deadline,
        registerGuide: guide,
        registerUrl: url,
        verifyStatus: verify,
        verifiedAt: verify === 'VERIFIED' ? new Date() : null,
        kind,
        dataOrigin: 'MANUAL_COLLECTION',
        sourceSheet: sheetName,
        isPublished: true,
      };

      const existing = await prisma.event.findFirst({ where: { city, name } });
      if (existing) {
        await prisma.event.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.event.create({ data });
        report.inserted++;
      }
    }
  }
  return report;
}
