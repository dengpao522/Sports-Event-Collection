'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CITIES, CATEGORIES } from '@/lib/constants';

const TYPES = [
  { key: 'EVENT_TIP', label: '我要投稿一场比赛', ph: '赛事名称、时间、地点、报名链接或公众号，知道多少写多少' },
  { key: 'CORRECTION', label: '信息有误，我来报错', ph: '哪里有误（时间变了/已截止或报满/链接失效/取消等），正确信息是？' },
  { key: 'FIND_REQUEST', label: '我要找的比赛（补采需求）', ph: '你想找什么城市、什么运动、大概什么时间的比赛？' },
] as const;

/** 投稿/报错/找赛需求表单（先审后发） */
export function SubmitForm({
  defaultType,
  defaultCity,
  defaultCategory,
  defaultEventId,
}: {
  defaultType?: string;
  defaultCity?: string;
  defaultCategory?: string;
  defaultEventId?: string;
}) {
  const [type, setType] = useState<string>(
    TYPES.some((t) => t.key === defaultType) ? defaultType! : 'EVENT_TIP',
  );
  const [city, setCity] = useState(defaultCity || '上海');
  const [category, setCategory] = useState(defaultCategory || '');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const active = TYPES.find((t) => t.key === type)!;

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          city: type === 'CORRECTION' ? '' : city,
          category: type === 'CORRECTION' ? '' : category,
          eventId: defaultEventId,
          content,
          contact,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? '提交失败，请稍后再试');
        return;
      }
      setDone(true);
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <div className="text-4xl">🙏</div>
        <h2 className="mt-3 text-lg font-bold text-gray-900">提交成功，感谢补充！</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          我们会人工核实，通过后更新到赛事列表。你留下的联系方式仅用于核实信息，不会用于其他用途。
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-brand-500 px-6 py-2 text-sm font-bold text-white hover:bg-brand-600"
        >
          返回找比赛
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      {/* 类型切换 */}
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              type === t.key
                ? 'border-brand-500 bg-brand-500 font-semibold text-white'
                : 'border-gray-300 text-gray-600 hover:border-brand-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {type !== 'CORRECTION' && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-gray-500">城市</span>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand-500"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-500">运动品类（选填）</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand-500"
            >
              <option value="">不限品类</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-gray-500">详细描述</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder={active.ph}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand-500"
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-gray-500">联系方式（选填，便于核实）</span>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="手机号 / 微信 / 邮箱，留空也可以"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand-500"
        />
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {loading ? '提交中…' : '提交'}
      </button>
      <p className="mt-3 text-center text-xs text-gray-400">所有用户提供的信息经人工审核后才会展示</p>
    </div>
  );
}
