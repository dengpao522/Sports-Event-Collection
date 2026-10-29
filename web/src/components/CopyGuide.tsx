'use client';

import { useState } from 'react';

/**
 * 报名渠道一键复制按钮：无直链赛事引导用户复制公众号/小程序名称，
 * 打开微信粘贴搜索直达报名入口，替代"记不住、手抄"的高流失路径。
 */
export function CopyGuide({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  /** 降级复制：剪贴板 API 不可用（权限被拒/旧环境）时用隐藏 textarea + execCommand */
  function fallbackCopy(): boolean {
    const ta = document.createElement('textarea');
    ta.value = text;
    // 移到视口外避免 iOS 弹出键盘/页面跳动，透明避免闪烁
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }

  async function copy() {
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 剪贴板 API 失败 → 降级 execCommand；两者都失败才不提示（用户可手动抄写）
      ok = fallbackCopy();
    }
    if (ok) {
      setCopied(true);
      // 2 秒后恢复按钮文案，避免用户误以为页面卡住
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={copy}
      className={`mt-3 w-full rounded-xl py-2.5 text-center text-sm font-bold transition-colors ${
        copied
          ? 'bg-green-500 text-white'
          : 'border border-brand-200 bg-white text-brand-600 hover:bg-brand-50'
      }`}
    >
      {copied ? '✓ 已复制，打开微信粘贴搜索' : '复制报名渠道名称'}
    </button>
  );
}
