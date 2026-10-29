import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['EVENT_TIP', 'CORRECTION', 'FIND_REQUEST'];

/** 接收用户投稿 / 报错 / 找赛需求（先审后发，默认 PENDING） */
export async function POST(req: Request) {
  let body: {
    type?: string;
    city?: string;
    category?: string;
    eventId?: string;
    content?: string;
    contact?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const type = body.type ?? '';
  const content = (body.content ?? '').trim();
  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: '投稿类型不合法' }, { status: 400 });
  }
  if (content.length < 5) {
    return NextResponse.json({ error: '请至少填写 5 个字的描述，方便我们核实' }, { status: 400 });
  }
  if (content.length > 1000) {
    return NextResponse.json({ error: '描述请控制在 1000 字以内' }, { status: 400 });
  }
  const contact = (body.contact ?? '').trim().slice(0, 100);
  // city/category/eventId 同样限制长度，与 content/contact 一致，防异常超长文本污染入库
  const city = (body.city ?? '').trim().slice(0, 50);
  const category = (body.category ?? '').trim().slice(0, 50);
  const eventId = body.eventId ? String(body.eventId).trim().slice(0, 64) : null;

  await prisma.submission.create({
    data: {
      type,
      city,
      category,
      eventId,
      content,
      contact,
      status: 'PENDING',
    },
  });

  return NextResponse.json({ ok: true });
}
