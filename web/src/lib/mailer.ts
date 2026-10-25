/**
 * 邮件发送抽象层
 * ---------------------------------------------------------------
 * MAIL_PROVIDER 三种取值：
 *  - mock（默认）：不真实发信，只在服务端控制台打印，便于开发验证
 *  - resend：调用 Resend HTTP API 真实发信（需配置 RESEND_API_KEY，
 *    免费档每月 3000 封/每天 100 封，个人站起步足够）
 *  - smtp：预留（T4 选型后补充）
 *
 * 防呆：provider=resend 但未配置密钥时自动降级为 mock 并告警，
 * 避免提醒任务在未配置完成时整批失败。
 */

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** 收件人邮箱脱敏：保留首字符与域名，中间打码（防订阅者 PII 落日志） */
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return `${email.slice(0, 1)}***${email.slice(at)}`;
}

/** mock 输出：控制台打印模拟邮件。
 * 开发环境打印全文便于验证内容；生产环境（如 resend 缺 key 意外降级）
 * 只打收件人脱敏值与正文长度，防止订阅者邮箱 / 邮件内确认 token 落入日志。 */
function logMock(payload: MailPayload, reason?: string): void {
  const isDev = process.env.NODE_ENV !== 'production';
  console.log(`\n📧 [MOCK MAIL]${reason ? `（${reason}）` : ''}未真实发送，内容如下：`);
  console.log('─'.repeat(60));
  console.log('收件人:', isDev ? payload.to : maskEmail(payload.to));
  console.log('主题:', payload.subject);
  if (isDev) {
    console.log('正文(text):\n', payload.text);
  } else {
    console.log(`正文(text): ${payload.text.length} 字符（生产环境不落全文，防 PII/凭证入日志）`);
  }
  console.log('─'.repeat(60), '\n');
}

/** Resend HTTP API 发信（零依赖，fetch 直调） */
async function sendViaResend(payload: MailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    logMock(payload, 'RESEND_API_KEY 或 MAIL_FROM 未配置，自动降级 mock');
    return;
  }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Resend 发信失败（HTTP ${resp.status}）: ${detail.slice(0, 300)}`);
  }
}

export async function sendMail(payload: MailPayload): Promise<void> {
  const provider = process.env.MAIL_PROVIDER ?? 'mock';

  if (provider === 'resend') {
    await sendViaResend(payload);
    return;
  }

  if (provider === 'smtp') {
    // 预留：T4 选型后实现（如 nodemailer）
    throw new Error('SMTP 发信尚未实现，请使用 MAIL_PROVIDER=resend 或 mock');
  }

  logMock(payload);
}

/** 生成订阅确认邮件内容 */
export function buildConfirmMail(opts: {
  eventName?: string;
  topic: string;
  confirmUrl: string;
}): MailPayload {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const what = opts.eventName ? `赛事「${opts.eventName}」` : opts.topic;
  return {
    to: '', // 由调用方填
    subject: `【全民运动】确认订阅${opts.eventName ? '：' + opts.eventName : ''}`,
    text:
      `你好，\n\n` +
      `你正在订阅${what}的提醒。请在 15 分钟内点击下方链接完成确认（未确认不会发送提醒）：\n` +
      `${opts.confirmUrl}\n\n` +
      `如非本人操作，请忽略此邮件。\n— 全民运动`,
    html:
      `<p>你好，</p><p>你正在订阅<b>${what}</b>的提醒。请点击下方按钮完成确认：</p>` +
      `<p><a href="${opts.confirmUrl}" style="background:#f97316;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none">确认订阅</a></p>` +
      `<p style="color:#888;font-size:12px">如非本人操作请忽略。<a href="${site}">全民运动</a></p>`,
  };
}
