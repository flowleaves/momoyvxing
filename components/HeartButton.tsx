"use client";

/**
 * 爱心按钮 —— 好友点一颗表示「我看过了」（已读回执）。
 *
 * 乐观更新：本地先翻转状态，请求失败再回滚。点爱心是低风险、高频率的动作，
 * 等一个来回才变色会显得很迟钝；失败了静默回滚 + 短暂提示就够。
 *
 * 作者自己的说说显示为不可点（点了也无意义），但保留计数展示。
 */

import { useState } from "react";

import { cn } from "./ui";

export function HeartButton({
  diaryId,
  initialCount,
  initialHearted,
  isOwn,
}: {
  diaryId: number;
  initialCount: number;
  initialHearted: boolean;
  /** 作者本人：只展示计数，不可点 */
  isOwn: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [hearted, setHearted] = useState(initialHearted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    if (busy || isOwn) return;

    const nextHearted = !hearted;
    const nextCount = count + (nextHearted ? 1 : -1);

    // 乐观更新
    setHearted(nextHearted);
    setCount(nextCount);
    setBusy(true);
    setError(false);

    try {
      const res = await fetch(`/api/diaries/${diaryId}/heart`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        hearted?: boolean;
        heartCount?: number;
      };
      if (!res.ok || !data.ok) throw new Error("failed");
      // 以服务端返回为准，纠正并发下的偏差
      setHearted(!!data.hearted);
      setCount(data.heartCount ?? nextCount);
    } catch {
      // 回滚
      setHearted(hearted);
      setCount(count);
      setError(true);
      setTimeout(() => setError(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  if (isOwn) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
        <HeartIcon filled={false} className="size-3.5" />
        {count > 0 ? `${count} 颗爱心` : "还没有爱心"}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={hearted}
      aria-label={hearted ? "取消爱心" : "点颗爱心表示看过啦"}
      title={error ? "没点上，再试一次" : hearted ? "已读过" : "表示看过啦"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        "transition-colors duration-150 disabled:opacity-60",
        hearted
          ? "bg-heart-soft text-heart-ink"
          : "text-ink-soft hover:bg-heart-soft/60",
      )}
    >
      <HeartIcon
        filled={hearted}
        className={cn("size-3.5", busy && "animate-pulse")}
      />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

/** 爱心图标：填充态用于「已点」，描边态用于「未点」 */
function HeartIcon({
  filled,
  className,
}: {
  filled: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1z" />
    </svg>
  );
}
