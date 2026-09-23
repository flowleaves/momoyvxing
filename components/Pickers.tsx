"use client";

import { useState } from "react";

import { MOODS, MAX_TAG_NAME_LENGTH, MAX_TAGS_PER_DIARY, VISIBILITY } from "@/lib/config";

import { cn } from "./ui";

// ---------------------------------------------------------------- 心情

export function MoodPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MOODS.map((m) => {
        const active = value === m.key;
        return (
          <button
            key={m.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : m.key)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition-colors duration-150",
              active
                ? "border-brand bg-brand-soft text-ink"
                : "border-line text-ink-soft hover:bg-brand-soft/40",
            )}
          >
            <span aria-hidden>{m.emoji}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

/** 心情色卡：颜色由皮肤决定（存的是 key，不是 hex） */
export function MoodDot({
  color,
  label,
  size = 10,
}: {
  color: string | null;
  label?: string;
  size?: number;
}) {
  if (!color) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block rounded-full"
        style={{
          width: size,
          height: size,
          background: `var(--mood-${color})`,
        }}
        aria-hidden
      />
      {label && <span className="text-xs text-ink-soft">{label}</span>}
    </span>
  );
}

// ---------------------------------------------------------------- 可见性

const VISIBILITY_OPTIONS = [
  { value: VISIBILITY.PUBLIC, label: "公开", hint: "谁都能看到" },
  { value: VISIBILITY.FRIENDS, label: "仅好友", hint: "互相关注的人" },
  { value: VISIBILITY.PRIVATE, label: "仅自己", hint: "只有你看得到" },
] as const;

export function VisibilityPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {VISIBILITY_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-sm transition-colors duration-150",
              active
                ? "border-brand bg-brand-soft text-ink"
                : "border-line text-ink-soft hover:bg-brand-soft/40",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- 标签

export function TagPicker({
  value,
  onChange,
  suggestions = [],
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");

  function add(name: string) {
    const clean = name.trim().slice(0, MAX_TAG_NAME_LENGTH);
    if (!clean || value.includes(clean) || value.length >= MAX_TAGS_PER_DIARY) return;
    onChange([...value, clean]);
    setInput("");
  }

  function remove(name: string) {
    onChange(value.filter((t) => t !== name));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs text-ink"
          >
            {t}
            <button
              type="button"
              onClick={() => remove(t)}
              aria-label={`删除标签 ${t}`}
              className="text-ink-soft transition-colors hover:text-ink"
            >
              ×
            </button>
          </span>
        ))}

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(input);
            } else if (e.key === "Backspace" && !input && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => add(input)}
          placeholder={value.length ? "" : "加个标签，回车确认"}
          maxLength={MAX_TAG_NAME_LENGTH}
          className="min-w-28 flex-1 bg-transparent px-1 py-1 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none"
        />
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-ink-soft">用过：</span>
          {suggestions
            .filter((s) => !value.includes(s))
            .slice(0, 10)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-soft transition-colors hover:bg-brand-soft/40"
              >
                {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
