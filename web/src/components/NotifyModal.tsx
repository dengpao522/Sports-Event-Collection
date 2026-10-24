'use client';

import { useState } from 'react';

/** 订阅请求体（与 /api/subscriptions 对齐） */
export interface SubRequest {
  email: string;
  type: string;
  eventId?: string;
  city?: string;
  category?: string;
}

/**
 * 免注册邮箱订阅弹窗
 * 用法：受控 open，传入订阅参数与主题文案；提交后展示成功态
 */
export function NotifyModal({
  open,
  onClose,
  topic,
  subRequest,
}: {
  open: boolean;
  onClose: () => void;
  topic: string; // 订阅对象的人话描述，如赛事名或“上海 · 球类 有新赛”
  subRequest: Omit<SubRequest, 'email'>;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  async function submit() {
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subRequest, email: v }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? '订阅失败，请稍后再试');
        return;
      }
      setDone(true);
    } catch {
      setError('网络异常，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {!done ? (
          <>
            <h3 className="text-base font-bold text-gray-900">🔔 订阅提醒</h3>
            <p className="mt-1.5 text-sm leading-6 text-gray-600">
              「{topic}」有消息时，我们会第一时间邮件通知你。开发期为模拟发送，不会真实发信。
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="输入你的邮箱，如 you@example.com"
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {loading ? '提交中…' : '确认提醒'}
              </button>
            </div>
          </>
        ) : (
          <div className="py-2 text-center">
            <div className="text-4xl">✅</div>
            <h3 className="mt-2 text-base font-bold text-gray-900">订阅成功</h3>
            <p className="mt-1.5 text-sm text-gray-600">
              确认邮件已发送至 <b>{email}</b>
              （开发期见服务端控制台）。确认后提醒即生效，可随时通过邮件中的链接退订。
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg bg-brand-500 px-6 py-2 text-sm font-bold text-white hover:bg-brand-600"
            >
              好的
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
