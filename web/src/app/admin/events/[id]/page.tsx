import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getEventById } from '@/lib/events';
import { EventForm } from '@/components/admin/EventForm';

export const dynamic = 'force-dynamic';

/** 编辑赛事：表单 + 数据溯源只读信息 + 该赛事订阅数 */
export default async function AdminEventEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const event = await getEventById(id);
  if (!event) notFound();

  const subCount = await prisma.subscription.count({ where: { eventId: id } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900">编辑赛事</h1>
        <Link
          href={`/events/${event.id}`}
          className="text-sm text-gray-500 hover:text-brand-600"
          target="_blank"
        >
          前台预览 ↗
        </Link>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {/* 数据溯源只读信息 */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
        <span>
          来源：
          {event.dataOrigin === 'USER_SUBMISSION' ? '用户投稿' : '运营采集'}
          {event.sourceSheet && `（${event.sourceSheet}）`}
        </span>
        <span>该赛事订阅提醒：{subCount} 人</span>
        <span>创建：{event.createdAt.toLocaleDateString('zh-CN')}</span>
        <span>最近修改：{event.updatedAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</span>
      </div>

      <EventForm event={event} />
    </div>
  );
}
