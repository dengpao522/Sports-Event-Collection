import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { newToken } from '@/lib/token';
import { sendMail, buildConfirmMail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

const EVENT_TYPES = ['EVENT_OPEN', 'DEADLINE_24H', 'DEADLINE_72H', 'NEXT_YEAR'];
const ALLOWED_TYPES = [...EVENT_TYPES, 'CITY_CATEGORY_NEW', 'CITY_LAUNCH'];

/** 创建订阅（P0 免注册，提交后发确认邮件，双重确认） */
export async function POST(req: Request) {
  let body: {
    email?: string;
    type?: string;
    eventId?: string;
    city?: string;
    category?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const { type, eventId, city } = body;
  const category = body.category || null;

  // 基础校验
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
  }
  if (!type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: '提醒类型不合法' }, { status: 400 });
  }
  if (EVENT_TYPES.includes(type) && !eventId) {
    return NextResponse.json({ error: '缺少赛事标识' }, { status: 400 });
  }
  if (type === 'CITY_CATEGORY_NEW' && !city) {
    return NextResponse.json({ error: '缺少城市' }, { status: 400 });
  }

  // 赛事类订阅需校验赛事存在
  let eventName: string | undefined;
  if (eventId) {
    const ev = await prisma.event.findUnique({ where: { id: eventId } });
    if (!ev) return NextResponse.json({ error: '赛事不存在或已下线' }, { status: 404 });
    eventName = ev.name;
  }

  // 幂等：SQLite 中 NULL 不参与唯一约束，手动查重
  const existing = await prisma.subscription.findFirst({
    where: { email, type, eventId: eventId ?? null, city: city ?? null, category: category ?? null },
  });

  const confirmToken = existing?.confirmToken ?? newToken();
  const alreadyConfirmed = existing?.confirmed ?? false;

  if (!existing) {
    await prisma.subscription.create({
      data: {
        email,
        type,
        eventId: eventId ?? null,
        city: city ?? null,
        category: category ?? null,
        confirmToken,
        unsubscribeToken: newToken(),
      },
    });
  }

  // 已确认过的重复订阅不再发确认邮件
  if (!alreadyConfirmed) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const topic = eventName
      ? `赛事「${eventName}」`
      : `${city}${category ? ' · ' + category : ''} 有新赛事`;
    const mail = buildConfirmMail({
      eventName,
      topic,
      confirmUrl: `${site}/api/subscriptions/confirm?token=${confirmToken}`,
    });
    mail.to = email;
    await sendMail(mail);
  }

  return NextResponse.json({ ok: true, alreadyConfirmed });
}
