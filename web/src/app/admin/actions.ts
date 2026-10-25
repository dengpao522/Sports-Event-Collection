'use server';

/**
 * 运营后台全部 Server Actions（FR-08）
 * 除登录外，每个动作开头先 requireAdmin() 守卫；
 * 写操作完成后 revalidate 相关路径，保证前台缓存即时刷新
 */
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ADMIN_COOKIE, requireAdmin, sessionTokenFor } from '@/lib/auth';
import { parseDeadline, parseRaceDate } from '@/lib/parse-date';
import { importWorkbook } from '@/lib/import-events';
import { CATEGORIES, CITIES } from '@/lib/constants';

/** 登录：校验 ADMIN_PASSWORD，写 7 天会话 Cookie */
export async function loginAction(formData: FormData) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    redirect(`/admin/login?error=${encodeURIComponent('服务端未配置 ADMIN_PASSWORD，请先在 web/.env 中设置')}`);
  }
  const password = String(formData.get('password') ?? '');
  if (password !== expected) {
    redirect(`/admin/login?error=${encodeURIComponent('密码不正确')}`);
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, sessionTokenFor(expected), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // 生产环境（HTTPS 部署）强制仅安全连接传输会话 Cookie，防中间人窃取
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 天免登录
  });
  redirect('/admin');
}

/** 退出登录：清除会话 Cookie */
export async function logoutAction() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

/**
 * 新建/编辑赛事（表单 id 为空即新建）。
 * 日期列保存原文，同时尽力解析出结构化日期（与导入脚本同一套解析逻辑）；
 * 标签按中英文逗号拆分为 JSON 数组字符串入库。
 */
export async function saveEventAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const back = id ? `/admin/events/${id}` : '/admin/events/new';
  if (!name || !city || !category) {
    redirect(`${back}?error=${encodeURIComponent('赛事名称、城市、品类为必填项')}`);
  }

  const raceDateText = String(formData.get('raceDateText') ?? '').trim();
  const deadlineText = String(formData.get('deadlineText') ?? '').trim();
  const race = parseRaceDate(raceDateText);
  const deadline = parseDeadline(deadlineText);
  const tags = JSON.stringify(
    String(formData.get('tags') ?? '')
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const data = {
    name,
    city,
    category,
    tags,
    kind: String(formData.get('kind') ?? 'PARTICIPATABLE'),
    status: String(formData.get('status') ?? 'UNVERIFIED'),
    verifyStatus: String(formData.get('verifyStatus') ?? 'UNVERIFIED'),
    raceDateText,
    raceDateStart: race.start,
    raceDateEnd: race.end,
    deadlineText,
    deadlineAt: deadline,
    venue: String(formData.get('venue') ?? '').trim(),
    registerGuide: String(formData.get('registerGuide') ?? '').trim(),
    registerUrl: String(formData.get('registerUrl') ?? '').trim(),
    isPublished: formData.get('isPublished') === 'on',
  };

  if (id) {
    await prisma.event.update({ where: { id }, data });
  } else {
    await prisma.event.create({ data });
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/events');
  redirect('/admin/events?saved=1');
}

/** 上架/下架切换（下架即前台不可见，数据保留） */
export async function togglePublishAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const ev = await prisma.event.findUnique({ where: { id }, select: { isPublished: true } });
  if (ev) {
    await prisma.event.update({ where: { id }, data: { isPublished: !ev.isPublished } });
  }
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/events');
}

/** 删除赛事（关联赛事的订阅记录随外键级联删除） */
export async function deleteEventAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (id) {
    await prisma.event.delete({ where: { id } });
  }
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/events');
  redirect('/admin/events?deleted=1');
}

/** 投稿/报错审核：通过或拒绝（仅改状态，内容处理由运营在赛事编辑页完成） */
export async function reviewSubmissionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  if (id && (decision === 'APPROVED' || decision === 'REJECTED')) {
    await prisma.submission.update({
      where: { id },
      data: { status: decision, reviewedAt: new Date() },
    });
  }
  revalidatePath('/admin/submissions');
  revalidatePath('/admin');
}

/** 采集线索自动核对：每批处理 25 条（抓原文+规则评分），多次点击继续剩余 */
export async function runAutocheckAction() {
  await requireAdmin();
  const { autocheckBatch } = await import('@/lib/autocheck');
  const summary = await autocheckBatch();
  revalidatePath('/admin/submissions');
  revalidatePath('/admin');
  redirect(
    `/admin/submissions?checked=${summary.checked}&autoPass=${summary.autoPass}` +
      `&autoReject=${summary.autoReject}&needHuman=${summary.needHuman}&remaining=${summary.remaining}`,
  );
}

/** 一键批量审核：按自动核对结果整组通过/拒绝 */
export async function bulkReviewAction(formData: FormData) {
  await requireAdmin();
  const autoStatus = String(formData.get('autoStatus') ?? '');
  const decision = String(formData.get('decision') ?? '');
  if (
    (autoStatus === 'AUTO_PASS' || autoStatus === 'AUTO_REJECT') &&
    (decision === 'APPROVED' || decision === 'REJECTED')
  ) {
    await prisma.submission.updateMany({
      where: { type: 'CRAWLER_TIP', status: 'PENDING', autoStatus },
      data: { status: decision, reviewedAt: new Date() },
    });
  }
  revalidatePath('/admin/submissions');
  revalidatePath('/admin');
  redirect(
    `/admin/submissions?bulk=${decision === 'APPROVED' ? 'approved' : 'rejected'}&group=${autoStatus}`,
  );
}

/**
 * 后台上传 xlsx 导入清单（与命令行 npm run import 同一套解析逻辑，幂等）
 * 成功后 redirect 到导入页并在 URL 上带统计参数展示报告
 */
export async function importSheetAction(formData: FormData) {
  await requireAdmin();
  const city = String(formData.get('city') ?? '');
  const file = formData.get('file');

  // 服务端校验：城市合法 + 文件为 xlsx
  if (!CITIES.includes(city as (typeof CITIES)[number])) {
    redirect(`/admin/import?error=${encodeURIComponent('请选择清单归属城市')}`);
  }
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/import?error=${encodeURIComponent('请选择要上传的 .xlsx 文件')}`);
  }
  if (!/\.xlsx$/i.test(file.name)) {
    redirect(`/admin/import?error=${encodeURIComponent('仅支持 .xlsx 格式（Excel 另存为“工作簿”）')}`);
  }

  const buffer = await file.arrayBuffer();
  // 解析失败（伪造/损坏的 xlsx）给出友好提示，不让服务端 500
  let r;
  try {
    r = await importWorkbook(city, buffer);
  } catch {
    redirect(`/admin/import?error=${encodeURIComponent('文件解析失败：请确认是有效的 .xlsx 工作簿（Excel 另存为 → 工作簿）')}`);
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/events');

  const q = new URLSearchParams({
    done: '1',
    city,
    inserted: String(r.inserted),
    updated: String(r.updated),
    gap: String(r.gap),
    skipped: String(r.skipped),
  });
  redirect(`/admin/import?${q.toString()}`);
}

/** 保存品类空窗说明（新增或更新，城市+品类唯一） */
export async function saveGapAction(formData: FormData) {
  await requireAdmin();
  const city = String(formData.get('city') ?? '');
  const category = String(formData.get('category') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  const seasonNote = String(formData.get('seasonNote') ?? '').trim();

  // 城市与品类必须来自白名单（品类含“全部”=城市级通用说明）
  const validCategory = category === '全部' || CATEGORIES.some((c) => c.key === category);
  if (!CITIES.includes(city as (typeof CITIES)[number]) || !validCategory || !reason) {
    redirect(`/admin/gaps?error=${encodeURIComponent('请完整选择城市与品类，并填写空窗原因')}`);
  }

  await prisma.gapReason.upsert({
    where: { city_category: { city, category } },
    update: { reason, seasonNote },
    create: { city, category, reason, seasonNote },
  });

  revalidatePath('/');
  revalidatePath('/admin/gaps');
  redirect('/admin/gaps?saved=1');
}

/** 删除品类空窗说明（该城市×品类前台恢复为默认空窗文案） */
export async function deleteGapAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (id) {
    await prisma.gapReason.delete({ where: { id } });
  }
  revalidatePath('/');
  revalidatePath('/admin/gaps');
  redirect('/admin/gaps?deleted=1');
}
