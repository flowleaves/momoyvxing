import Link from "next/link";

import { VISIBILITY_LABELS, findMood } from "@/lib/config";
import {
  countChars,
  formatCharCount,
  formatFullTime,
  formatTime,
  truncate,
} from "@/lib/format";
import type { DiaryWithMeta, ReplyForClient } from "@/lib/types";

import { Avatar } from "./Avatar";
import { HeartButton } from "./HeartButton";
import { MarkdownView } from "./MarkdownView";
import { MoodDot } from "./Pickers";
import { ReplySection } from "./ReplySection";
import { EmptyState } from "./ui";

/** 当前登录用户的最小信息，用来渲染回复框的头像与昵称 */
export interface ViewerInfo {
  id: number;
  nickname: string;
  avatar: string;
  avatar_kind: string;
}

export function DiaryCard({
  diary,
  linkable = true,
  viewer,
  replies,
}: {
  diary: DiaryWithMeta;
  /** 详情页里不再需要「继续看」链接，同时显示全文不截断 */
  linkable?: boolean;
  /** 当前登录用户，用来判断是不是自己的说说（自己的不能点爱心）+ 回复框 */
  viewer: ViewerInfo;
  /** 已加载的回复（按时间正序）。列表页传空数组，详情页传全量 */
  replies?: ReplyForClient[];
}) {
  const mood = findMood(diary.mood);
  // 列表里截断 + 给「继续看」；详情页（linkable=false）必须吐全文，
  // 否则用户点了「继续看」进来还是被截断 —— 这正是之前报的那个 bug。
  const { text, truncated } = linkable
    ? truncate(diary.content_md)
    : { text: diary.content_md, truncated: false };
  // 字数按全文统计，不因预览截断而变小 —— 右下角那个数字描述的是「这篇写了多少」
  const charLabel = formatCharCount(countChars(diary.content_md));

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

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <HeartButton
          diaryId={diary.id}
          initialCount={diary.heart_count}
          initialHearted={diary.hearted_by_me}
          isOwn={diary.user_id === viewer.id}
        />
        {diary.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
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
        {charLabel && (
          <span
            className="ml-auto text-[11px] tabular-nums text-ink-soft/70"
            title={`本篇共 ${countChars(diary.content_md)} 字（不含空白）`}
          >
            {charLabel}
          </span>
        )}
      </div>

      {/* 回复区。replies 为 undefined 时才不渲染（调用方明确表示这里不该有回复区），
          传空数组表示「能回复但暂时还没人回」，要显示「回复」入口 */}
      {replies !== undefined && (
        <ReplySection
          diaryId={diary.id}
          initialReplies={replies}
          viewer={viewer}
        />
      )}
    </article>
  );
}

export function Timeline({
  items,
  viewer,
  repliesByDiary,
  emptyTitle = "还没有写过什么",
  emptyDescription = "上面那个框，写点什么就开始啦",
}: {
  items: DiaryWithMeta[];
  viewer: ViewerInfo;
  /** 每篇日记的回复（key = diary.id）。不传则不渲染回复区 */
  repliesByDiary?: Map<number, ReplyForClient[]>;
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
        <DiaryCard
          key={d.id}
          diary={d}
          viewer={viewer}
          replies={repliesByDiary?.get(d.id) ?? (repliesByDiary ? [] : undefined)}
        />
      ))}
    </div>
  );
}
