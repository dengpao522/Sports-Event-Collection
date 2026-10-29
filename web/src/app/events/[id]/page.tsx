import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getEventById, parseTags } from '@/lib/events';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusTimeline } from '@/components/StatusTimeline';
import { EventSubscribe } from '@/components/EventSubscribe';
import { CopyGuide } from '@/components/CopyGuide';
import { EVENT_KIND } from '@/lib/constants';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ev = await getEventById(id);
  return { title: ev?.name ?? '赛事详情' };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-gray-100 py-3 text-sm last:border-0">
      <div className="w-20 shrink-0 text-gray-400">{label}</div>
      <div className="min-w-0 flex-1 text-gray-800">{children}</div>
    </div>
  );
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ev = await getEventById(id);
  if (!ev || !ev.isPublished) notFound();

  // SportsEvent 结构化数据：name/时间/地点/状态，帮助搜索引擎生成富摘要
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: ev.name,
    url: `${SITE_URL}/events/${ev.id}`,
    sport: ev.category,
    eventStatus:
      ev.status === 'POSTPONED'
        ? 'https://schema.org/EventPostponed'
        : 'https://schema.org/EventScheduled',
    ...(ev.raceDateStart ? { startDate: ev.raceDateStart.toISOString() } : {}),
    ...(ev.raceDateEnd ? { endDate: ev.raceDateEnd.toISOString() } : {}),
    location: {
      '@type': 'Place',
      name: ev.venue || ev.city,
      address: { '@type': 'PostalAddress', addressLocality: ev.city, addressCountry: 'CN' },
    },
  };

  // 容错解析项目标签：tags 存脏数据（非法 JSON）时降级为无标签（公共 helper，与列表页一致）
  const tags = parseTags(ev.tags);
  const isRegisterable =
    ev.kind === 'PARTICIPATABLE' && ['OPEN', 'FIRST_COME', 'UPCOMING'].includes(ev.status);
  // 报名进行/即将开启但未采集到直链：引导按“报名方式”中的官方渠道操作，而非误报已结束
  const showRegisterButton = isRegisterable && Boolean(ev.registerUrl);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* JSON-LD 防注入：赛事名/地点来自爬虫与导入数据，可能含 </script> 提前闭合标签造成
          存储型 XSS；将所有 < 转义为 \u003c（JSON 合法转义，浏览器/爬虫解析结果不变） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <Link href="/" className="text-sm text-gray-500 hover:text-brand-600">
        ← 返回赛事列表
      </Link>

      {/* 延期/取消红条 */}
      {ev.status === 'POSTPONED' && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          该赛事存在延期或取消变更，请以官方最新通知为准，订阅者将收到邮件提醒
        </div>
      )}

      {/* 头部 */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-brand-50 to-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ev.status} />
          {ev.kind !== 'PARTICIPATABLE' && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
              {EVENT_KIND[ev.kind as keyof typeof EVENT_KIND]}
            </span>
          )}
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs text-gray-600 border border-gray-200">
            {ev.city} · {ev.category}
          </span>
          {/* 可信度徽章（原「信息来源」行简化而来）：只展示核实状态，不暴露采集渠道细节 */}
          {ev.verifyStatus === 'VERIFIED' ? (
            <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-600">
              ✓ 官方已核实
              {ev.verifiedAt ? ` · ${ev.verifiedAt.toISOString().slice(0, 10)}` : ''}
            </span>
          ) : (
            <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-600">
              ● 信息待核实
            </span>
          )}
        </div>
        <h1 className="mt-3 text-xl font-extrabold leading-snug text-gray-900">{ev.name}</h1>
      </div>

      {/* 时间线 */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <StatusTimeline status={ev.status} />
      </div>

      {/* 信息 */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-6 py-2">
        <Row label="比赛日期">{ev.raceDateText}</Row>
        <Row label="地点">{ev.venue || '待官方公布'}</Row>
        <Row label="报名截止">{ev.deadlineText || '待官方公布'}</Row>
        {tags.length > 0 && (
          <Row label="项目标签">
            {tags.map((t) => (
              <span key={t} className="mr-2 text-gray-600">
                #{t}
              </span>
            ))}
          </Row>
        )}
        {ev.registerGuide && <Row label="报名方式">{ev.registerGuide}</Row>}
      </div>

      {/* 操作区 */}
      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6">
        {showRegisterButton ? (
          <a
            href={ev.registerUrl}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="block w-full rounded-xl bg-brand-500 py-3 text-center text-sm font-bold text-white hover:bg-brand-600"
          >
            前往官方报名 ↗
          </a>
        ) : ev.kind === 'VIEWING' ? (
          <div className="rounded-xl bg-gray-50 py-3 text-center text-sm text-gray-500">
            该赛事为观赛内容，请通过官方票务渠道购票
          </div>
        ) : isRegisterable ? (
          /* 无直链但可报名（约占可报名赛事三成）：展示官方渠道引导卡片 + 一键复制，
             替代原来"没得点"的灰字提示，降低用户流失 */
          ev.registerGuide ? (
            <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
              <p className="text-sm font-semibold text-gray-900">按官方渠道报名</p>
              <p className="mt-1.5 text-sm leading-6 text-gray-700">{ev.registerGuide}</p>
              <CopyGuide text={ev.registerGuide} />
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 py-3 text-center text-sm text-gray-500">
              报名渠道暂未公布，订阅后开报即通知
            </div>
          )
        ) : ev.status === 'PENDING_ANNOUNCEMENT' || ev.status === 'UNVERIFIED' ? (
          <div className="rounded-xl bg-gray-50 py-3 text-center text-sm text-gray-500">
            报名尚未开启或信息待核实，订阅后开报即通知
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 py-3 text-center text-sm text-gray-500">
            报名已结束，可关注下一届
          </div>
        )}
        <div className="mt-3">
          <EventSubscribe eventId={ev.id} status={ev.status} kind={ev.kind} eventName={ev.name} />
        </div>
        {isRegisterable && (
          <p className="mt-3 text-center text-xs text-gray-400">
            报名与支付均在官方渠道完成，本站不经手任何费用
          </p>
        )}
      </div>

      {/* 报错入口 */}
      <div className="mt-4 text-center text-sm text-gray-400">
        信息有误？
        <Link
          href={`/submit?type=CORRECTION&eventId=${ev.id}`}
          className="ml-1 text-brand-600 hover:underline"
        >
          告诉我们
        </Link>
      </div>
    </div>
  );
}
