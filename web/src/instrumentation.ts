/**
 * Next.js 服务启动钩子（官方 instrumentation 约定）
 * 仅在 nodejs 运行时启动：
 *   1. 提醒邮件调度器（每小时）
 *   2. 每日自动采集 + 核验调度器（凌晨 03:00，详见 lib/daily-crawler.ts）
 * edge 运行时直接跳过。
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startNotifyScheduler } = await import('./lib/scheduler');
    startNotifyScheduler();
    const { startCrawlerScheduler } = await import('./lib/daily-crawler');
    startCrawlerScheduler();
  }
}
