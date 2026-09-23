import Link from "next/link";

import { VISIBILITY_LABELS, findMood } from "@/lib/config";
import { formatFullTime, formatTime, truncate } from "@/lib/format";
import type { DiaryWithMeta } from "@/lib/types";

import { Avatar } from "./Avatar";
import { MarkdownView } from "./MarkdownView";
import { MoodDot } from "./Pickers";
import { EmptyState } from "./ui";

export function DiaryCard({
  diary,
  linkable = true,
}: {
  diary: DiaryWithMeta;
  /** 详情页里不再需要「继续看」链接 */
  linkable?: boolean;
}) {
  const mood = findMood(diary.mood);
  const { text, truncated } = truncate(diary.content_md);

  return (
    <article className="rounded-lg border border-line bg-card p-4 shadow-soft">
      <header className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Avatar
          user={{
            nickname: diary.author_nickname,
            avatar: diary.author_avatar,
            avatar_kind: diary.author_avatar_kind,
          }}
          size={26}
        />
        <span className="text-sm text-ink">{diary.author_nickname}</span>
        <time
          className="text-xs text-ink-soft"
          title={formatFullTime(diary.created_at)}
        >
          {formatTime(diary.created_at)}
        </time>
        {mood && <MoodDot color={mood.color} label={mood.label} />}
        {diary.visibility !== 0 && (
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-ink-soft">
            {VISIBILITY_LABELS[diary.visibility]}
          </span>
        )}
      </header>

      <MarkdownView content={text} />

      {truncated && linkable && (
        <Link
          href={`/d/${diary.id}`}
          className="mt-1.5 inline-block text-sm text-brand-deep underline underline-offset-2"
        >
          继续看
        </Link>
      )}

      {diary.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {diary.tags.map((t) => (
            <Link
              key={t}
              href={`/tags/${encodeURIComponent(t)}`}
              className="rounded-full bg-brand-soft/70 px-2 py-0.5 text-xs text-ink-soft transition-colors hover:text-ink"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

export function Timeline({
  items,
  emptyTitle = "还没有写过什么",
  emptyDescription = "上面那个框，写点什么就开始啦",
}: {
  items: DiaryWithMeta[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-card/50">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((d) => (
        <DiaryCard key={d.id} diary={d} />
      ))}
    </div>
  );
}
