"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { DraftRow } from "@/lib/types";

import { MarkdownView } from "./MarkdownView";
import { MoodPicker, TagPicker, VisibilityPicker } from "./Pickers";
import { Alert, Button, Card, cn } from "./ui";

const AUTOSAVE_DELAY = 5000;

export function DiaryEditor({
  initialDraft,
  suggestions = [],
}: {
  initialDraft: DraftRow | null;
  suggestions?: string[];
}) {
  const router = useRouter();

  const [content, setContent] = useState(initialDraft?.content_md ?? "");
  const [mood, setMood] = useState<string | null>(initialDraft?.mood ?? null);
  const [visibility, setVisibility] = useState(initialDraft?.visibility ?? 0);
  const [tags, setTags] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);

  const [draftState, setDraftState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /**
   * 草稿自动保存：内容/心情/可见性变化后 5 秒落库。
   * 首次渲染不触发（否则打开页面就会白写一条空草稿）。
   */
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setDraftState("saving");
      try {
        await fetch("/api/drafts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentMd: content, mood, visibility }),
        });
        setDraftState("saved");
      } catch {
        setDraftState("idle");
      }
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timer);
  }, [content, mood, visibility]);

  async function save() {
    const text = content.trim();
    if (!text || busy) return;

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/diaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentMd: text, mood, visibility, tags }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "没存上，再试一次");
        return;
      }
      // 服务端已在保存成功后清掉草稿
      router.push("/");
      router.refresh();
    } catch {
      setError("网络好像出了点问题");
    } finally {
      setBusy(false);
    }
  }

  const draftHint =
    draftState === "saving"
      ? "正在存草稿…"
      : draftState === "saved"
        ? "草稿已自动保存"
        : "每 5 秒自动存草稿";

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {(
              [
                { key: false, label: "写" },
                { key: true, label: "预览" },
              ] as const
            ).map((t) => (
              <button
                key={String(t.key)}
                type="button"
                onClick={() => setPreview(t.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm transition-colors duration-150",
                  preview === t.key
                    ? "bg-brand-soft text-ink"
                    : "text-ink-soft hover:bg-brand-soft/40",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-ink-soft">{draftHint}</span>
        </div>

        {preview ? (
          <div className="min-h-40 rounded-md border border-line bg-card px-3.5 py-2.5">
            {content.trim() ? (
              <MarkdownView content={content} />
            ) : (
              <p className="text-sm text-ink-soft/60">还没写什么</p>
            )}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            rows={14}
            autoFocus
            placeholder={"今天过得怎么样？\n\n支持 Markdown，回车就能换行。"}
            className={cn(
              "w-full resize-y rounded-md border border-line bg-card px-3.5 py-3",
              "text-sm leading-relaxed text-ink placeholder:text-ink-soft/50",
              "focus:border-brand",
            )}
          />
        )}
      </Card>

      <Card className="space-y-4 p-4">
        <section>
          <h2 className="mb-2 text-sm text-ink-soft">心情</h2>
          <MoodPicker value={mood} onChange={setMood} />
        </section>

        <section>
          <h2 className="mb-2 text-sm text-ink-soft">谁可以看</h2>
          <VisibilityPicker value={visibility} onChange={setVisibility} />
        </section>

        <section>
          <h2 className="mb-2 text-sm text-ink-soft">标签</h2>
          <TagPicker value={tags} onChange={setTags} suggestions={suggestions} />
        </section>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex items-center justify-end gap-3">
        <span className="hidden text-xs text-ink-soft sm:inline">
          Ctrl + Enter 保存
        </span>
        <Button size="lg" onClick={save} loading={busy} disabled={!content.trim()}>
          写好了
        </Button>
      </div>
    </div>
  );
}
