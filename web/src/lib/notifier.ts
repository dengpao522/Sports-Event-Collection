/**
 * 订阅提醒扫描引擎（FR-03/04 服务端）
 * ---------------------------------------------------------------
 * 每次运行扫描三类已确认（confirmed）订阅并发送提醒邮件：
 *  1. DEADLINE_24H / DEADLINE_72H —— 报名截止倒计时提醒
 *  2. EVENT_OPEN —— 关注的赛事开始报名提醒
 *  3. CITY_CATEGORY_NEW —— 城市×品类有新赛上架提醒
 *
 * 防重发统一用 Subscription.notifiedAt（最近一次发送时间）：
 *  - 截止提醒：进入窗口且 notifiedAt 早于窗口起点才发（72H 发过后，
 *    到 24H 窗口时仍会再发一次，符合“前3天+前1天”各提醒一次的预期）
 *  - 开报名提醒：发过一次（notifiedAt 已设置）就永不再发
 *  - 新赛提醒：notifiedAt 即扫描水位，只提醒上次运行之后新入库的赛事
 *
 * 调用方：
 *  - src/lib/scheduler.ts（随 Next 服务常驻，每小时自动扫描）
 *  - scripts/notify.ts（npm run notify 手动触发）
 */
import { prisma } from './prisma';
import { sendMail, type MailPayload } from './mailer';

const HOUR = 3600_000;

/** 一次扫描的执行结果摘要（供脚本输出与日志） */
export interface NotifySummary {
  /** 截止提醒发送数 */
  deadlineSent: number;
  /** 开报名提醒发送数 */
  openSent: number;
  /** 新赛提醒发送数（按订阅计） */
  newEventSent: number;
  /** 失败数（单封失败不中断整体扫描） */
  errors: number;
}

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** 统一的邮件底部队徽 + 退订链接 */
function footer(unsubscribeToken: string): string {
  return (
    `<p style="color:#999;font-size:12px;margin-top:24px">` +
    `<a href="${site()}/">全民运动</a> · 找一场你能参加的比赛<br>` +
    `<a href="${site()}/api/subscriptions/unsubscribe?token=${unsubscribeToken}" style="color:#999">退订此类提醒</a></p>`
  );
}

/** 报名按钮（有直链才展示） */
function registerButton(registerUrl: string, eventId: string): string {
  const href = registerUrl || `${site()}/events/${eventId}`;
  const label = registerUrl ? '前往官方报名 ↗' : '查看赛事详情';
  return (
    `<p style="margin-top:16px"><a href="${href}" ` +
    `style="background:#f97316;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none">${label}</a></p>`
  );
}

/** 截止倒计时提醒邮件 */
function buildDeadlineMail(opts: {
  eventName: string;
  deadlineAt: Date;
  hoursLeft: number;
  unsubscribeToken: string;
  eventId: string;
  registerUrl: string;
}): MailPayload {
  const dl = opts.deadlineAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  // 48 小时以上用“天”表述更自然
  const left =
    opts.hoursLeft >= 48
      ? `${Math.floor(opts.hoursLeft / 24)} 天`
      : `${opts.hoursLeft} 小时`;
  return {
    to: '',
    subject: `【全民运动】「${opts.eventName}」报名 ${left} 后截止`,
    text:
      `你好，\n\n你订阅的赛事「${opts.eventName}」将于 ${dl} 截止报名，剩余约 ${left}。\n` +
      `想参加的话请尽快在官方渠道完成报名：\n${opts.registerUrl || `${site()}/events/${opts.eventId}`}\n\n` +
      `报名与支付均在官方渠道完成，本站不经手任何费用。\n— 全民运动`,
    html:
      `<p>你好，</p><p>你订阅的赛事 <b>「${opts.eventName}」</b> 将于 <b>${dl}</b> 截止报名，剩余约 <b style="color:#ea580c">${left}</b>。</p>` +
      `<p>想参加的话请尽快完成报名：</p>` +
      registerButton(opts.registerUrl, opts.eventId) +
      footer(opts.unsubscribeToken),
  };
}

/** 开报名提醒邮件 */
function buildOpenMail(opts: {
  eventName: string;
  unsubscribeToken: string;
  eventId: string;
  registerUrl: string;
}): MailPayload {
  return {
    to: '',
    subject: `【全民运动】「${opts.eventName}」开始报名啦`,
    text:
      `你好，\n\n你等待的赛事「${opts.eventName}」现已开放报名！\n` +
      `报名入口：\n${opts.registerUrl || `${site()}/events/${opts.eventId}`}\n\n— 全民运动`,
    html:
      `<p>你好，</p><p>你等待的赛事 <b>「${opts.eventName}」</b> 现已开放报名 🎉</p>` +
      registerButton(opts.registerUrl, opts.eventId) +
      footer(opts.unsubscribeToken),
  };
}

/** 城市×品类新赛上架提醒邮件（多场合并为一封） */
function buildNewEventMail(opts: {
  city: string;
  category: string;
  events: Array<{ id: string; name: string; raceDateText: string; statusLabel: string; status: string }>;
  unsubscribeToken: string;
}): MailPayload {
  const rows = opts.events
    .map(
      (e) =>
        `<li><b>${e.name}</b>（${e.raceDateText || '日期待官宣'} · ${e.statusLabel}）` +
        ` <a href="${site()}/events/${e.id}">详情 ↗</a></li>`
    )
    .join('');
  const textRows = opts.events
    .map((e) => ` · ${e.name}（${e.raceDateText || '日期待官宣'} · ${e.statusLabel}） ${site()}/events/${e.id}`)
    .join('\n');
  return {
    to: '',
    subject: `【全民运动】${opts.city}·${opts.category}有 ${opts.events.length} 场新赛事上架`,
    text:
      `你好，\n\n你订阅的「${opts.city} · ${opts.category}」有新的赛事上架：\n\n${textRows}\n\n— 全民运动`,
    html:
      `<p>你好，</p><p>你订阅的 <b>${opts.city} · ${opts.category}</b> 有 <b>${opts.events.length}</b> 场新赛事上架：</p>` +
      `<ul style="padding-left:20px;line-height:1.9">${rows}</ul>` +
      footer(opts.unsubscribeToken),
  };
}

/** 单封发送并计数，失败不中断整体扫描 */
async function safeSend(payload: MailPayload, summary: NotifySummary): Promise<void> {
  try {
    await sendMail(payload);
  } catch (e) {
    summary.errors += 1;
    console.error('[notifier] 邮件发送失败:', e);
  }
}

/**
 * 扫描一类订阅并逐个处理（截止提醒通用逻辑）
 * @param windowHours 提醒窗口（24 或 72 小时）
 */
async function scanDeadline(windowHours: 24 | 72, summary: NotifySummary): Promise<void> {
  const now = Date.now();
  const subs = await prisma.subscription.findMany({
    where: { type: windowHours === 24 ? 'DEADLINE_24H' : 'DEADLINE_72H', confirmed: true, eventId: { not: null } },
    include: { event: true },
  });

  for (const sub of subs) {
    const ev = sub.event;
    // 赛事条件：仍在可报名状态、截止时间有效且未过
    if (!ev || !ev.isPublished) continue;
    if (!['OPEN', 'FIRST_COME'].includes(ev.status) || !ev.deadlineAt) continue;
    const msLeft = ev.deadlineAt.getTime() - now;
    if (msLeft <= 0 || msLeft > windowHours * HOUR) continue;
    // 窗口起点：本窗口发过（notifiedAt >= 起点）则跳过
    const windowStart = ev.deadlineAt.getTime() - windowHours * HOUR;
    if (sub.notifiedAt && sub.notifiedAt.getTime() >= windowStart) continue;

    await safeSend(
      buildDeadlineMail({
        eventName: ev.name,
        deadlineAt: ev.deadlineAt,
        hoursLeft: Math.max(1, Math.round(msLeft / HOUR)),
        unsubscribeToken: sub.unsubscribeToken,
        eventId: ev.id,
        registerUrl: ev.registerUrl,
      }),
      summary
    );
    summary.deadlineSent += 1;
    await prisma.subscription.update({ where: { id: sub.id }, data: { notifiedAt: new Date() } });
  }
}

/** 开报名提醒：赛事状态变为 OPEN 且从未发过 */
async function scanEventOpen(summary: NotifySummary): Promise<void> {
  const subs = await prisma.subscription.findMany({
    where: { type: 'EVENT_OPEN', confirmed: true, eventId: { not: null }, notifiedAt: null },
    include: { event: true },
  });

  for (const sub of subs) {
    const ev = sub.event;
    // 仅“报名中”触发；错过窗口（已截止/已结束）不再补发
    if (!ev || !ev.isPublished || ev.status !== 'OPEN') continue;

    await safeSend(
      buildOpenMail({
        eventName: ev.name,
        unsubscribeToken: sub.unsubscribeToken,
        eventId: ev.id,
        registerUrl: ev.registerUrl,
      }),
      summary
    );
    summary.openSent += 1;
    await prisma.subscription.update({ where: { id: sub.id }, data: { notifiedAt: new Date() } });
  }
}

/** 城市×品类新赛提醒：上次水位之后新入库的已发布赛事 */
async function scanNewEvents(summary: NotifySummary): Promise<void> {
  const now = Date.now();
  const subs = await prisma.subscription.findMany({
    where: { type: 'CITY_CATEGORY_NEW', confirmed: true, city: { not: null } },
  });

  for (const sub of subs) {
    // 扫描水位：上次发送时间；从未发过则只看最近 24h，避免新订阅收到历史轰炸
    const since = sub.notifiedAt && sub.notifiedAt.getTime() > now - 24 * HOUR ? sub.notifiedAt : new Date(now - 24 * HOUR);
    const events = await prisma.event.findMany({
      where: {
        isPublished: true,
        kind: 'PARTICIPATABLE',
        createdAt: { gt: since },
        city: sub.city ?? undefined,
        ...(sub.category ? { category: sub.category } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    if (events.length === 0) continue;

    await safeSend(
      buildNewEventMail({
        city: sub.city ?? '',
        category: sub.category ?? '全部品类',
        events: events.map((e) => ({
          id: e.id,
          name: e.name,
          raceDateText: e.raceDateText,
          statusLabel: statusLabel(e.status),
          status: e.status,
        })),
        unsubscribeToken: sub.unsubscribeToken,
      }),
      summary
    );
    summary.newEventSent += 1;
    await prisma.subscription.update({ where: { id: sub.id }, data: { notifiedAt: new Date() } });
  }
}

/** 报名状态中文标签（notifier 内独立小工具，避免引入组件层依赖） */
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING_ANNOUNCEMENT: '待官宣',
    UPCOMING: '即将报名',
    OPEN: '报名中',
    FIRST_COME: '报满即止',
    UNVERIFIED: '待核实',
  };
  return map[status] ?? status;
}

/** 执行一轮完整扫描（三类提醒） */
export async function runNotifyOnce(): Promise<NotifySummary> {
  const summary: NotifySummary = { deadlineSent: 0, openSent: 0, newEventSent: 0, errors: 0 };
  await scanDeadline(72, summary);
  await scanDeadline(24, summary);
  await scanEventOpen(summary);
  await scanNewEvents(summary);
  return summary;
}
