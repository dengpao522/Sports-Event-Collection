'use client';

import { deleteEventAction } from '@/app/admin/actions';

/** 删除赛事按钮：带浏览器原生确认，防误删 */
export function DeleteEventButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteEventAction}
      onSubmit={(e) => {
        if (!window.confirm(`确定删除「${name}」？\n关联的订阅提醒也会一并删除，且不可恢复。`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        删除
      </button>
    </form>
  );
}
