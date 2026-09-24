"use client";

/**
 * 「我的说说」列表里的一张卡片 —— 支持就地编辑内容与可见范围。
 *
 * ⚠️ 时间不从 lib/format 里取。那个模块的 formatTime 依赖「当前时间」算
 *    「刚刚 / N 分钟前」，Client Component 会先被 SSR 再被 hydration，
 *    两次算出的值必然可能不同 —— 项目里已经写明「只在 Server Component 里调用」。
 *    所以时间标签由外层 Server Component 算好，以字符串传进来。
 *
 * 保存 / 删除后走 router.refresh() 让 Server Component 重新取数，
 * 不在客户端维护一份列表副本 —— 少一份状态就少一处不同步。
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MAX_DIARY_LENGTH, VISIBILITY_LABELS, findMood } from "@/lib/config";
import type { DiaryWithMeta } from "@/lib/types";

import { MarkdownView } from "./MarkdownView";
import { MoodDot, VisibilityPicker } from "./Pickers";
import { Alert, Button, cn } from "./ui";

/** 列表里只显示前这么多字，要看全的点「看详情」 */
const PREVIEW_LIMIT = 500;

export function MyDiaryCard({
  diary,
  timeLabel,
  fullTimeLabel,
}: {
  diary: DiaryWithMeta;
  timeLabel: string;
  fullTimeLabel: string;
}) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(diary.content_md);
  const [visibility, setVisibility] = useState(diary.visibility);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<{ tone: "info" | "error"; text: string } | null>(
    null,
  );

  const mood = findMood(diary.mood);
  const preview =
    diary.content_md.length > PREVIEW_LIMIT
      ? `${diary.content_md.slice(0, PREVIEW_LIMIT)}…`
      : diary.content_md;

  const changed =
    content.trim() !== diary.content_md.trim() || visibility !== diary.visibility;

  function openEditor() {
    // 每次进来都从当前数据重置，避免上次取消留下的残值
    setContent(diary.content_md);
    setVisibility(diary.visibility);
    setConfirming(false);
    setMsg(null);
    setEditing(true);
  }

  function cancelEditor() {
    setEditing(false);
    setMsg(null);
  }

  async function save() {
    const next = content.trim();
    if (!next) {
      setMsg({ tone: "error", text: "内容不能为空" });
      return;
    }
    if (next.length > MAX_DIARY_LENGTH) {
      setMsg({ tone: "error", text: `太长了，最多 ${MAX_DIARY_LENGTH} 字` });
      return;
    }
    if (!changed) {
      setEditing(false);
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/diaries/${diary.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentMd: next, visibility }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setMsg({ tone: "error", text: data.error || "没存上，再试一次" });
        return;
      }
      setEditing(false);
      setMsg({ tone: "info", text: "改好啦" });
      router.refresh();
    } catch {
      setMsg({ tone: "error", text: "网络好像出了点问题" });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/diaries/${diary.id}`, { method: "DELETE" });
      if (!res.ok) {
        setMsg({ tone: "error", text: "没删掉，再试一次" });
        setConfirming(false);
        return;
      }
      router.refresh();
    } catch {
      setMsg({ tone: "error", text: "网络好像出了点问题" });
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="rounded-lg border border-line bg-card p-4 shadow-soft">
      <header className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <time className="text-xs text-ink-soft" title={fullTimeLabel}>
          {timeLabel}
        </time>
        {mood && <MoodDot color={mood.color} label={mood.label} />}
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-ink-soft">
          {VISIBILITY_LABELS[diary.visibility]}
        </span>
        {diary.updated_at !== diary.created_at && (
          <span className="text-[11px] text-ink-soft">改过</span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          {editing ? null : confirming ? (
            <>
              <span className="text-xs text-ink-soft">确定删掉？</span>
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                删
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-xs text-ink-soft hover:underline"
              >
                算了
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={openEditor}
                className="text-xs text-brand-deep hover:underline"
              >
                编辑
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-xs text-ink-soft transition-colors hover:text-red-600"
              >
                删除
              </button>
            </>
          )}
        </div>
      </header>

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className={cn(
              "w-full resize-y rounded-md border border-line bg-card px-3.5 py-3",
              "text-sm leading-relaxed text-ink placeholder:text-ink-soft/50",
              "focus:border-brand",
            )}
          />

          <div>
            <p className="mb-2 text-sm text-ink-soft">谁可以看</p>
            <VisibilityPicker value={visibility} onChange={setVisibility} />
          </div>

          <div className="flex items-center gap-2">
            <span className="mr-auto text-xs text-ink-soft">
              {content.trim().length} 字
            </span>
            <Button variant="ghost" size="sm" onClick={cancelEditor} disabled={busy}>
              取消
            </Button>
            <Button size="sm" onClick={save} loading={busy} disabled={!content.trim()}>
              存下
            </Button>
          </div>
        </div>
      ) : (
        <>
          <MarkdownView content={preview} />

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={`/d/${diary.id}`}
              className="text-xs text-brand-deep underline underline-offset-2"
            >
              看详情
            </Link>
            {diary.tags.length > 0 && (
              <span className="text-xs text-ink-soft">
                {diary.tags.map((t) => `#${t}`).join("　")}
              </span>
            )}
          </div>
        </>
      )}

      {msg && (
        <div className="mt-3">
          <Alert tone={msg.tone === "error" ? "error" : "info"}>{msg.text}</Alert>
        </div>
      )}
    </article>
  );
}
