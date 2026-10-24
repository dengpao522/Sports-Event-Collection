/**
 * 把赛事清单里的中文日期文本“尽力解析”为标准日期，解析不了返回 null（原文保留在 raceDateText）。
 * 跨年规则：数据采集于 2026 年秋冬，凡明确 2027 年、或月份在 1–2 月（元旦/春节档）归到 2027 年。
 */

/** 推断年份：明确写 2027 用 2027；月份 1–2 月默认跨年到 2027；其余 2026 */
function resolveYear(month: number, text: string): number {
  if (/20\d{2}\s*年/.test(text)) {
    const y = text.match(/(20\d{2})\s*年/);
    if (y) return Number(y[1]);
  }
  if (month <= 2) return 2027;
  return 2026;
}

/** 从文本中提取第一个“M月D日”并构造 Date（UTC 午夜，避免时区偏移） */
function matchFirstDate(text: string): { date: Date; month: number; day: number; index: number } | null {
  const m = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = resolveYear(month, text);
  return { date: new Date(Date.UTC(year, month - 1, day)), month, day, index: m.index ?? 0 };
}

export interface ParsedDateRange {
  start: Date | null;
  end: Date | null;
}

/** 解析比赛日期，兼容“12月9-13日”“11月26日起”等区间写法 */
export function parseRaceDate(text: string): ParsedDateRange {
  const t = (text || '').trim();
  if (!t || /待核实|待定|待公布|待官宣|未官宣|秋季档|春季档|冬季档|跨.*月|滚动|常年|至\s*12\s*月\s*31/.test(t)) {
    // “至12月31日”是线上赛长周期，不适合单点排序，也归为不可精确解析
    return { start: null, end: null };
  }
  const first = matchFirstDate(t);
  if (!first) return { start: null, end: null };

  let end: Date | null = null;
  // 区间：首个日期后出现 “-D日 / ~D日 / 至D日”
  const after = t.slice(first.index);
  const rangeM = after.match(/[-\-~～至到]\s*(\d{1,2})\s*[日号]/);
  if (rangeM) {
    const endDay = Number(rangeM[1]);
    end = new Date(Date.UTC(first.date.getUTCFullYear(), first.month - 1, endDay));
    if (end < first.date) {
      // 跨年区间（如 12月31-1月2日）
      end = new Date(Date.UTC(first.date.getUTCFullYear() + 1, first.month - 1, endDay));
    }
  }
  return { start: first.date, end };
}

/**
 * 解析报名截止时间。
 * 策略：优先截取“截止/截至/止”之后的片段取日期；否则取全文最后一个日期。
 * “报满即止/额满即止/报完即止/先到先得”不产生精确时间。
 */
export function parseDeadline(text: string): Date | null {
  const t = (text || '').trim();
  if (!t || /报满即止|额满即止|报完即止|先到先得|报完为止/.test(t)) return null;

  const segments = t.split(/截止|截至|为止|止(?!损)/).filter(Boolean);
  const candidates: string[] = [];
  if (segments.length > 1) candidates.push(segments.slice(1).join(' ')); // “截止”之后的文字
  candidates.push(t);

  for (const seg of candidates) {
    const all = Array.from(seg.matchAll(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/g));
    if (all.length) {
      const last = all[all.length - 1];
      const month = Number(last[1]);
      const day = Number(last[2]);
      const year = resolveYear(month, seg);
      // 尝试附带时间 HH:MM
      let h = 23;
      let min = 59;
      const tm = seg.match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
      if (tm) {
        h = Number(tm[1]);
        min = Number(tm[2]);
      }
      return new Date(Date.UTC(year, month - 1, day, h, min));
    }
  }
  return null;
}

/** 判断文本是否明确表达“待官宣/未发布” */
export function isPendingAnnouncement(text: string): boolean {
  return /待官宣|未官宣|待公布|尚未官宣|按惯例.*(开报|报名)/.test(text);
}
