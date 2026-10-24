/**
 * 手动触发一轮订阅提醒扫描
 * 运行：在 web/ 目录执行  npm run notify
 * 用途：本地验证、配合系统任务计划（Windows 计划任务 / cron）做外部调度
 */
import { runNotifyOnce } from '../src/lib/notifier';

const summary = await runNotifyOnce();
console.log(
  `[notify] 本轮扫描完成：截止提醒 ${summary.deadlineSent} 封，` +
    `开报名提醒 ${summary.openSent} 封，新赛提醒 ${summary.newEventSent} 封，失败 ${summary.errors} 封`
);
process.exit(0);
