import Link from 'next/link';
import type { Event } from '@prisma/client';
import { saveEventAction } from '@/app/admin/actions';
import {
  CATEGORIES,
  CITIES,
  EVENT_KIND,
  REG_STATUS,
  SOON_CITIES,
  VERIFY_STATUS,
} from '@/lib/constants';

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
const labelCls = 'block text-sm font-semibold text-gray-700';

/** 把库内 JSON 标签还原为可编辑的中文逗号分隔文本 */
function tagsToText(tags: string): string {
  try {
    const arr: unknown = JSON.parse(tags);
    return Array.isArray(arr) ? arr.join('，') : '';
  } catch {
    return '';
  }
}

/**
 * 赛事新建/编辑共用表单（纯服务端表单，无客户端 JS）
 * 日期填中文原文即可，保存时服务端复用导入脚本的解析逻辑生成结构化日期
 */
export function EventForm({ event }: { event?: Event }) {
  const isEdit = Boolean(event);
  return (
    <form action={saveEventAction} className="space-y-6">
      {event && <input type="hidden" name="id" value={event.id} />}

      {/* 基本信息 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold text-gray-900">基本信息</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className={labelCls}>
              赛事名称 *
            </label>
            <input id="name" name="name" required defaultValue={event?.name} className={`mt-1 ${inputCls}`} placeholder="如：2026 上海马拉松" />
          </div>
          <div>
            <label htmlFor="city" className={labelCls}>
              城市 *
            </label>
            <select id="city" name="city" required defaultValue={event?.city} className={`mt-1 ${inputCls}`}>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {SOON_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}（即将开通）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="category" className={labelCls}>
              一级品类 *
            </label>
            <select id="category" name="category" required defaultValue={event?.category} className={`mt-1 ${inputCls}`}>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="tags" className={labelCls}>
              二级标签（逗号分隔）
            </label>
            <input
              id="tags"
              name="tags"
              defaultValue={event ? tagsToText(event.tags) : ''}
              className={`mt-1 ${inputCls}`}
              placeholder="如：半马，元旦"
            />
          </div>
          <div>
            <label htmlFor="venue" className={labelCls}>
              地点
            </label>
            <input id="venue" name="venue" defaultValue={event?.venue} className={`mt-1 ${inputCls}`} placeholder="如：虹口·北外滩国客中心码头" />
          </div>
          <div>
            <label htmlFor="kind" className={labelCls}>
              赛事性质
            </label>
            <select id="kind" name="kind" defaultValue={event?.kind ?? 'PARTICIPATABLE'} className={`mt-1 ${inputCls}`}>
              {Object.entries(EVENT_KIND).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 状态与日期 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold text-gray-900">状态与日期</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className={labelCls}>
              报名状态
            </label>
            <select id="status" name="status" defaultValue={event?.status ?? 'UNVERIFIED'} className={`mt-1 ${inputCls}`}>
              {Object.entries(REG_STATUS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="verifyStatus" className={labelCls}>
              信息可信度
            </label>
            <select id="verifyStatus" name="verifyStatus" defaultValue={event?.verifyStatus ?? 'UNVERIFIED'} className={`mt-1 ${inputCls}`}>
              {Object.entries(VERIFY_STATUS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="raceDateText" className={labelCls}>
              比赛日期（中文原文）
            </label>
            <input
              id="raceDateText"
              name="raceDateText"
              defaultValue={event?.raceDateText}
              className={`mt-1 ${inputCls}`}
              placeholder="如：11月8日（周日）或 待官宣"
            />
          </div>
          <div>
            <label htmlFor="deadlineText" className={labelCls}>
              报名截止（中文原文）
            </label>
            <input
              id="deadlineText"
              name="deadlineText"
              defaultValue={event?.deadlineText}
              className={`mt-1 ${inputCls}`}
              placeholder="如：10月20日 18:00 截止 或 报满即止"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          日期支持“M月D日 / M月D-D日 / 待官宣 / 报满即止”等写法，系统保存时自动解析用于排序与提醒；解析不了的保留原文。
        </p>
      </section>

      {/* 报名方式 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold text-gray-900">报名方式</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="registerGuide" className={labelCls}>
              报名指引（渠道与操作步骤）
            </label>
            <textarea
              id="registerGuide"
              name="registerGuide"
              rows={3}
              defaultValue={event?.registerGuide}
              className={`mt-1 ${inputCls}`}
              placeholder="如：官网 marstonrunning.com 报名，或关注公众号“XX赛事”"
            />
          </div>
          <div>
            <label htmlFor="registerUrl" className={labelCls}>
              报名直链（可点击的官网/报名页地址）
            </label>
            <input
              id="registerUrl"
              name="registerUrl"
              type="url"
              defaultValue={event?.registerUrl}
              className={`mt-1 ${inputCls}`}
              placeholder="https://..."
            />
          </div>
        </div>
      </section>

      {/* 发布控制 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={event ? event.isPublished : true}
            className="h-4 w-4 accent-brand-500"
          />
          <span className="text-sm font-semibold text-gray-700">发布到前台（取消勾选即存为草稿，前台不可见）</span>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
        >
          {isEdit ? '保存修改' : '创建赛事'}
        </button>
        <Link href="/admin/events" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          取消返回
        </Link>
      </div>
    </form>
  );
}
