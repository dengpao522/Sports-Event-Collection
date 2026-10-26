/**
 * 每日自动「采集 + 核验 + 失效下架」调度器（P0 数据信任基建）
 *
 * 由 src/instrumentation.ts 在 Next 服务启动时挂载（仅 nodejs 运行时）。
 * 策略：
 *   1. 每日 03:00 依次执行采集（最酷全国 / 赛事大全 / 黑练日历，逐源独立进程，
 *      单源失败不拖垮其余源）→ 三源核验（verify_nationwide.py，失效自动下架）。
 *   2. 启动补偿：若距上次成功运行超过 24 小时（凌晨任务因重启错过），延迟 5 分钟补跑一轮。
 *   3. 防重入：任一时刻最多一条流水线在跑；重设定时器前先清旧定时器。
 *
 * 环境变量：
 *   CRAWLER_ENABLED=0   关闭调度（构建 / CI 场景）
 *   CRAWLER_PYTHON      指定 Python 解释器（默认 win32→python，其他→python3）
 *   CRAWLER_DIR         crawler 目录（默认 ../crawler，即 web 的上级目录下）
 *   CRAWLER_BOOT_RUN=0  关闭启动补偿（仅在每日定时跑）
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const globalForCrawler = globalThis as unknown as {
  quanminCrawlerTimer: ReturnType<typeof setTimeout> | undefined;
  quanminCrawlerRunning: boolean | undefined;
};

const CRAWLER_DIR = process.env.CRAWLER_DIR || path.resolve(process.cwd(), '..', 'crawler');
const STATE_FILE = path.join(CRAWLER_DIR, '.crawler_state.json'); // 上次成功运行时间（不提交）
const RUN_AT_HOUR = 3; // 每日触发时刻（本地时区）
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 超过 24h 未成功 → 启动时补跑
const BOOT_DELAY_MS = 5 * 60 * 1000; // 补跑延迟，避开服务启动高峰
const COLLECT_TIMEOUT_MS = 90 * 60 * 1000; // 单源采集超时（全量翻页较慢）
const VERIFY_TIMEOUT_MS = 60 * 60 * 1000; // 全量核验超时（442 条 × 0.8s ≈ 6 分钟，留足余量）

function pythonBin(): string {
  if (process.env.CRAWLER_PYTHON) return process.env.CRAWLER_PYTHON;
  return process.platform === 'win32' ? 'python' : 'python3';
}

/** 运行一个 Python 脚本（日志直通控制台），非零退出 / 超时 / 启动失败均 reject */
function runScript(script: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[crawler] $ ${pythonBin()} ${script} ${args.join(' ')}`);
    const child = spawn(pythonBin(), [script, ...args], {
      cwd: CRAWLER_DIR,
      stdio: 'inherit', // Python 自带中文日志前缀，直通即可
      windowsHide: true,
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${path.basename(script)} 超时（${timeoutMs / 60000} 分钟），已终止`));
    }, timeoutMs);
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(script)} 退出码 ${code}`));
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** 每日流水线：逐源采集 → 全量核验 → 记录成功时间（核验失败不算成功，明天补跑） */
async function runDailyPipeline(): Promise<void> {
  if (globalForCrawler.quanminCrawlerRunning) {
    console.log('[crawler] 上一轮流水线仍在运行，跳过本次触发');
    return;
  }
  globalForCrawler.quanminCrawlerRunning = true;
  const startedAt = Date.now();
  console.log('[crawler] ===== 每日任务开始：采集（最酷全国 / 赛事大全 / 黑练）→ 三源核验 =====');

  const collectScript = path.join(CRAWLER_DIR, 'collect.py');
  // 三个直入库源逐个跑：collect.py 单进程内若某源抛异常会中断后续源，分进程可隔离故障
  const sources: Array<[string, string]> = [
    ['nationwide', '最酷全国列表'],
    ['events', '最酷赛事大全'],
    ['heilian', '黑练赛事日历'],
  ];
  for (const [source, label] of sources) {
    try {
      await runScript(collectScript, ['--source', source], COLLECT_TIMEOUT_MS);
      console.log(`[crawler] ${label}（${source}）采集完成`);
    } catch (e) {
      // 单源失败只记日志，其余源继续
      console.error(`[crawler] ${label}（${source}）采集失败:`, e);
    }
  }

  try {
    await runScript(
      path.join(CRAWLER_DIR, 'verify_nationwide.py'),
      ['--interval', '0.8'],
      VERIFY_TIMEOUT_MS
    );
  } catch (e) {
    console.error('[crawler] 三源核验失败（本轮不记成功，次日重试）:', e);
    return;
  }

  try {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ lastSuccessAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch {
    // 状态文件写失败不影响主流程（最多导致下次启动多补跑一轮）
  }
  console.log(`[crawler] ===== 每日任务完成，耗时 ${Math.round((Date.now() - startedAt) / 60000)} 分钟 =====`);
}

/** 重排下一次每日触发（幂等：先清旧定时器，防止叠加） */
function scheduleNext(): void {
  if (globalForCrawler.quanminCrawlerTimer) clearTimeout(globalForCrawler.quanminCrawlerTimer);

  const now = new Date();
  const next = new Date(now);
  next.setHours(RUN_AT_HOUR, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);

  globalForCrawler.quanminCrawlerTimer = setTimeout(() => {
    runDailyPipeline().finally(scheduleNext);
  }, next.getTime() - now.getTime());
  console.log(`[crawler] 下次自动采集核验：${next.toLocaleString('zh-CN')}`);
}

/** 启动调度（幂等：重复调用不会叠加） */
export function startCrawlerScheduler(): void {
  if (process.env.CRAWLER_ENABLED === '0') return;
  if (globalForCrawler.quanminCrawlerTimer || globalForCrawler.quanminCrawlerRunning) return;

  scheduleNext();

  // 启动补偿：dev / 服务器白天频繁重启，凌晨任务可能从未触发过；
  // 距上次成功超过 24h（或从无状态文件）则延后 5 分钟补跑一轮
  if (process.env.CRAWLER_BOOT_RUN === '0') return;
  let needBootRun = true;
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as { lastSuccessAt?: string };
    const last = state.lastSuccessAt ? new Date(state.lastSuccessAt).getTime() : NaN;
    if (Number.isFinite(last) && Date.now() - last < MAX_AGE_MS) needBootRun = false;
  } catch {
    // 无状态文件 / 解析失败 → 视为从未成功跑过
  }
  if (needBootRun) {
    setTimeout(() => {
      runDailyPipeline().finally(scheduleNext);
    }, BOOT_DELAY_MS);
    console.log('[crawler] 检测到超过 24 小时未成功采集核验，5 分钟后补跑一轮');
  }
}
