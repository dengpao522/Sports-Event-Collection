import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** 一键退订（邮件底部链接） */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) {
    return new Response('退订链接无效', { status: 400 });
  }
  const sub = await prisma.subscription.findUnique({ where: { unsubscribeToken: token } });
  if (!sub) {
    return new Response('订阅不存在或已退订', { status: 404 });
  }
  await prisma.subscription.delete({ where: { id: sub.id } });
  return new Response(
    `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>已退订</title></head>
     <body style="font-family:sans-serif;text-align:center;padding:60px;color:#1f2937">
       <div style="font-size:40px">👋</div>
       <h2>已取消该提醒</h2>
       <p style="color:#6b7280">今后不会再向 <b>${sub.email}</b> 发送这一提醒。</p>
       <a href="/" style="color:#ea580c">返回全民运动 →</a>
     </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
