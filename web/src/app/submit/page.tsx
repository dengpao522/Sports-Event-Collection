import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SubmitForm } from '@/components/SubmitForm';

export const metadata: Metadata = { title: '赛事投稿 / 找赛需求' };

export const dynamic = 'force-dynamic';

// Next 16：searchParams 为 Promise，需 await（用 Suspense 包裹读取组件）
export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-extrabold text-gray-900">和我们一起补全赛事信息</h1>
      <p className="mt-1.5 text-sm leading-6 text-gray-500">
        发现了漏采的比赛、信息有误，或想找某类比赛？告诉我们，核实后会更新。
      </p>
      <div className="mt-5">
        <Suspense>
          <SubmitForm
            defaultType={pick('type')}
            defaultCity={pick('city')}
            defaultCategory={pick('category')}
            defaultEventId={pick('eventId')}
          />
        </Suspense>
      </div>
    </div>
  );
}
