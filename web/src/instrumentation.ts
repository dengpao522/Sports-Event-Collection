/**
 * Next.js 服务启动钩子（官方 instrumentation 约定）
 * 仅在 nodejs 运行时启动提醒调度器；edge 运行时直接跳过。
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startNotifyScheduler } = await import('./lib/scheduler');
    startNotifyScheduler();
  }
}
