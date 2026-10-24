import { requireAdmin } from '@/lib/auth';
import { EventForm } from '@/components/admin/EventForm';

export const dynamic = 'force-dynamic';

/** 手工新建赛事（默认草稿可先不发布） */
export default async function AdminEventNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-gray-900">新建赛事</h1>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <EventForm />
    </div>
  );
}
