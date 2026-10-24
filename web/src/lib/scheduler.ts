/**
 * 提醒任务常驻调度器
 * 由 src/instrumentation.ts 在 Next 服务启动时调用（仅 nodejs 运行时）。
 * 策略：启动后 15 秒先跑一轮（等 dev 服务器就绪），之后每 60 分钟一轮。
 * 可用环境变量 NOTIFY_ENABLED=0 关闭（如脚本/构建场景不想启动定时器）。
 */
import { runNotifyOnce } from './notifier';

const globalForScheduler = globalThis as unknown as {
  quanminNotifyTimer: ReturnType<typeof setInterval> | undefined;
};

async function tick(): Promise<void> {
  try {
    const summary = await runNotifyOnce();
    // 无任何发送时保持静默，避免日志噪声
    if (summary.deadlineSent || summary.openSent || summary.newEventSent || summary.errors) {
      console.log(
        `[notifier] 扫描完成：截止提醒 ${summary.deadlineSent} 封，开报名 ${summary.openSent} 封，` +
          `新赛 ${summary.newEventSent} 封，失败 ${summary.errors} 封`
      );
    }
  } catch (e) {
    // 调度器内异常只记日志，绝不影响 Web 服务本身
    console.error('[notifier] 扫描异常:', e);
  }
}

/** 启动定时扫描（幂等：重复调用不会叠加定时器） */
export function startNotifyScheduler(): void {
  if (process.env.NOTIFY_ENABLED === '0') return;
  if (globalForScheduler.quanminNotifyTimer) return;

  globalForScheduler.quanminNotifyTimer = setInterval(tick, 60 * 60 * 1000);
  setTimeout(tick, 15_000);
  console.log('[notifier] 定时提醒调度已启动（每小时扫描一轮）');
}
