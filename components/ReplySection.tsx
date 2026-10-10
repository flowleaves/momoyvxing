"use client";

/**
 * 回复区 —— 挂在每篇说说下方。
 *
 * 客户端组件的原因：提交后要**就地追加**一条回复，不能整页刷新
 * （刷新会丢掉滚动位置，也会让刚刚写的内容闪一下）。
 *
 * ⚠️ 时间不由本组件计算。回复的时间标签（time_label / full_time_label）
 *    是服务端算好后随数据下发的 —— 这里会先被 SSR 再被 hydration，
 *    若自己去 `new Date()` 判断「今天」，两趟跨过午夜就会算出不同的字符串，
 *    触发 hydration 不一致警告。这与项目里 MyDiaryCard 的处理方式一致。
 *
 * 权限完全由服务端决定：这里不判断「能不能回」，只管发；服务端回 404
 * 就显示「找不到这篇说说」。
 */

import { useState } from "react";

import { MAX_REPLY_LENGTH } from "@/lib/config";
import { countChars } from "@/lib/format";
import type { ReplyForClient } from "@/lib/types";

import { Avatar } from "./Avatar";
import { MarkdownView } from "./MarkdownView";
import { Button, cn } from "./ui";

export function ReplySection({
  diaryId,
  initialReplies,
  viewer,
}: {
  diaryId: number;
  initialReplies: ReplyForClient[];
  /** 当前登录用户，用于新回复的乐观展示 */
  viewer: { id: number; nickname: string; avatar: string; avatar_kind: string };
}) {
  const [replies, setReplies] = useState<ReplyForClient[]>(initialReplies);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(initialReplies.length > 0);

  const count = countChars(content);
  const tooLong = count > MAX_REPLY_LENGTH;
  const canSubmit = content.trim().length > 0 && !tooLong && !busy;

  async function submit() {
    const text = content.trim();
    if (!text || busy || tooLong) return;

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/diaries/${diaryId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentMd: text }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        reply?: ReplyForClient;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.reply) {
        setError(data.error || "没发出去，再试一次");
        return;
      }
      // 追加到末尾 —— 列表是时间正序，新回复自然在最后
      setReplies((prev) => [...prev, data.reply as ReplyForClient]);
      setContent("");
      setOpen(true);
    } catch {
      setError("网络好像出了点问题");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-3 border-t border-line/70 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2 inline-flex items-center gap-1.5 text-xs text-ink-soft transition-colors hover:text-ink"
        aria-expanded={open}
      >
        <ReplyIcon className="size-3.5" />
        {replies.length > 0 ? `${replies.length} 条回复` : "回复"}
        <span className={cn("transition-transform", open && "rotate-180")}>
          <ChevronIcon className="size-3" />
        </span>
      </button>

      {open && (
        <div className="space-y-3">
          {replies.length > 0 && (
            <ol className="space-y-2.5">
              {replies.map((r) => (
                <li key={r.id} className="flex gap-2">
                  <Avatar
                    user={{
                      nickname: r.author_nickname,
                      avatar: r.author_avatar,
                      avatar_kind: r.author_avatar_kind,
                    }}
                    size={22}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-xs text-ink">
                        {r.author_nickname}
                      </span>
                      <time
                        className="text-[11px] text-ink-soft"
                        title={r.full_time_label}
                      >
                        {r.time_label}
                      </time>
                    </div>
                    <MarkdownView
                      content={r.content_md}
                      className="text-sm leading-relaxed"
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="flex gap-2">
            <Avatar
              user={{
                nickname: viewer.nickname,
                avatar: viewer.avatar,
                avatar_kind: viewer.avatar_kind,
              }}
              size={22}
            />
            <div className="min-w-0 flex-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={2}
                placeholder="说点什么…"
                className={cn(
                  "w-full resize-y rounded-md border bg-card px-3 py-2",
                  "text-sm leading-relaxed text-ink placeholder:text-ink-soft/50",
                  tooLong ? "border-red-300" : "border-line focus:border-brand",
                )}
              />
              <div className="mt-1.5 flex items-center gap-2">
                {count > 0 && (
                  <span
                    className={cn(
                      "text-[11px] tabular-nums",
                      tooLong ? "text-red-600" : "text-ink-soft",
                    )}
                  >
                    {count}
                    {tooLong ? ` / ${MAX_REPLY_LENGTH}` : ""}
                  </span>
                )}
                <span className="ml-auto hidden text-[11px] text-ink-soft sm:inline">
                  Ctrl + Enter 发送
                </span>
                <Button size="sm" onClick={submit} disabled={!canSubmit} loading={busy}>
                  回复
                </Button>
              </div>
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-4.6A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
