"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { MoodPicker } from "./Pickers";
import { Button, Card, cn } from "./ui";

/**
 * 速记框 —— 碎碎念的主入口
 *
 * 目标是「打开就能写」：默认只有一个输入框，Ctrl/Cmd+Enter 直接存。
 * 心情选择折叠起来，想标的时候再展开，不增加默认路径的负担。
 */
export function QuickNote() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [showMood, setShowMood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = content.trim().length > 0 && !busy;

  async function submit() {
    const text = content.trim();
    if (!text || busy) return;

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/diaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentMd: text, mood }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "没存上，再试一次");
        return;
      }
      setContent("");
      setMood(null);
      setShowMood(false);
      router.refresh();
      areaRef.current?.focus();
    } catch {
      setError("网络好像出了点问题");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <textarea
        ref={areaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        rows={3}
        placeholder="今天有什么想记下来的？"
        className={cn(
          "w-full resize-y rounded-md border border-line bg-card px-3.5 py-2.5",
          "text-sm leading-relaxed text-ink placeholder:text-ink-soft/50",
          "focus:border-brand",
        )}
      />

      {showMood && (
        <div className="mt-3">
          <MoodPicker value={mood} onChange={setMood} />
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowMood((v) => !v)}
          className="rounded-full px-2.5 py-1 text-xs text-ink-soft transition-colors hover:bg-brand-soft/50"
        >
          {showMood ? "收起心情" : mood ? "心情已选" : "标个心情"}
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-ink-soft sm:inline">
            Ctrl + Enter 快速保存
          </span>
          <Button onClick={submit} disabled={!canSubmit} loading={busy}>
            记下来
          </Button>
        </div>
      </div>
    </Card>
  );
}
