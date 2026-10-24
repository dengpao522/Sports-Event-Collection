/**
 * 邮件发送抽象层
 * ---------------------------------------------------------------
 * MVP 开发期 MAIL_PROVIDER=mock：不真实发信，只在服务端控制台打印，
 *   便于端到端验证订阅流程而无需配置密钥。
 * 正式期：实现 resend / smtp 分支（T4 选型后补充），调用方无需改动。
 */

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail(payload: MailPayload): Promise<void> {
  const provider = process.env.MAIL_PROVIDER ?? 'mock';

  if (provider === 'mock') {
    // 控制台输出模拟邮件（含确认/退订链接）
    console.log('\n📧 [MOCK MAIL] 未真实发送，内容如下：');
    console.log('─'.repeat(60));
    console.log('收件人:', payload.to);
    console.log('主题:', payload.subject);
    console.log('正文(text):\n', payload.text);
    console.log('─'.repeat(60), '\n');
    return;
  }

  // 预留：provider === 'resend' / 'smtp' 时在此实现
  throw new Error(`邮件服务商 "${provider}" 尚未配置，请使用 MAIL_PROVIDER=mock 或补充实现`);
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
