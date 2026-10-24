import { prisma } from '@/lib/prisma';
import { escapeHtml } from '@/lib/escape-html';

export const dynamic = 'force-dynamic';

/** 订阅确认（用户点击邮件链接，GET 请求） */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) {
    return new Response('确认链接无效', { status: 400 });
  }
  const sub = await prisma.subscription.findUnique({ where: { confirmToken: token } });
  if (!sub) {
    return new Response('订阅不存在或链接已失效', { status: 404 });
  }
  if (!sub.confirmed) {
    await prisma.subscription.update({ where: { id: sub.id }, data: { confirmed: true } });
  }
  // 简单的确认结果页
  return new Response(
    `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>订阅已确认</title></head>
     <body style="font-family:sans-serif;text-align:center;padding:60px;color:#1f2937">
       <div style="font-size:40px">✅</div>
       <h2>订阅已确认</h2>
       <p style="color:#6b7280">赛事有消息时，我们会邮件通知 <b>${escapeHtml(sub.email)}</b></p>
       <a href="/" style="color:#ea580c">返回全民运动 →</a>
     </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
