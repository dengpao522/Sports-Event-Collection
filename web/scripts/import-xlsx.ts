/**
 * 赛事清单 Excel → SQLite 一次性/可重复导入脚本
 * ---------------------------------------------------------------
 * 数据源：仓库根目录 /赛事清单/ 下的城市清单 xlsx（运营现有工作流产物）
 * 解析与入库逻辑统一在 src/lib/import-events.ts（与后台上传导入共用）。
 * 运行：在 web/ 目录执行  npm run import
 * 说明：同样也可在运营后台 /admin/import 页面上传 xlsx 导入，二者效果一致。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { prisma } from '../src/lib/prisma';
import { importWorkbook } from '../src/lib/import-events';

// 清单文件与城市映射（MVP 仅沪杭；新增城市在此登记即可）
const FILES: Array<{ city: string; match: RegExp }> = [
  { city: '上海', match: /^上海赛事清单/ },
  { city: '杭州', match: /^杭州赛事清单/ },
];

async function main() {
  const dataDir = path.resolve(process.cwd(), '..', '赛事清单');
  console.log('数据源目录:', dataDir);
  const totals = { inserted: 0, updated: 0, gap: 0, skipped: 0 };

  for (const { city, match } of FILES) {
    const file = fs
      .readdirSync(dataDir)
      .filter((f) => match.test(f) && f.endsWith('.xlsx') && !f.startsWith('~$'))
      .map((f) => path.join(dataDir, f))[0];
    if (!file) {
      console.warn(`[跳过] 未找到 ${city} 的清单文件`);
      continue;
    }
    const buffer = fs.readFileSync(file);
    // ArrayBuffer 兼容转换（Buffer 是 Uint8Array 子类，直接取底层 buffer）
    const r = await importWorkbook(city, buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    console.log(`[${city}] 新增赛事 ${r.inserted}，更新 ${r.updated}，空窗说明 ${r.gap}，跳过空行 ${r.skipped}`);
    Object.entries(r).forEach(([k, v]) => {
      if (k in totals) (totals as Record<string, number>)[k] += v as number;
    });
  }
  console.log('合计:', totals);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('导入失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
