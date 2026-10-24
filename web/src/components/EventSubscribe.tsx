'use client';

import { useState } from 'react';
import { NotifyModal } from './NotifyModal';

/**
 * 详情页订阅按钮：根据赛事状态给出最合适的默认提醒类型与文案
 */
export function EventSubscribe({
  eventId,
  status,
  kind,
  eventName,
}: {
  eventId: string;
  status: string;
  kind: string;
  eventName: string;
}) {
  const [open, setOpen] = useState(false);

  // 历史/观赛类不提供订阅（来年提醒属 P1 增强，MVP 仅对可报名赛事提供）
  if (kind !== 'PARTICIPATABLE') return null;

  let label = '🔔 有消息时提醒我';
  let type = 'EVENT_OPEN';
  if (status === 'OPEN' || status === 'FIRST_COME') {
    label = '🔔 报名截止前提醒我';
    type = 'DEADLINE_24H';
  } else if (status === 'PENDING_ANNOUNCEMENT' || status === 'UPCOMING' || status === 'UNVERIFIED') {
    label = '🔔 开报名时提醒我';
    type = 'EVENT_OPEN';
  } else if (status === 'POSTPONED') {
    label = '🔔 赛事恢复时提醒我';
    type = 'EVENT_OPEN';
  } else {
    // 已截止/进行中：MVP 提示来年关注
    label = '🔔 下一届提醒我';
    type = 'NEXT_YEAR';
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white hover:bg-brand-600"
      >
        {label}
      </button>
      <p className="mt-2 text-center text-xs text-gray-400">免注册 · 仅需邮箱 · 可随时取消</p>
      <NotifyModal
        open={open}
        onClose={() => setOpen(false)}
        topic={eventName}
        subRequest={{ type, eventId }}
      />
    </>
  );
}
