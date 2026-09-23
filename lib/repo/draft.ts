/**
 * 草稿数据访问
 *
 * 每用户一份当前草稿（drafts.user_id 是 UNIQUE），用 UPSERT 覆盖。
 * 编辑已有日记时 diary_id 指向那篇日记，用于「继续编辑」。
 */

import { getDb, now } from "../db";
import type { DraftRow } from "../types";

export function getDraft(userId: number): DraftRow | undefined {
  return getDb()
    .raw.prepare(`SELECT * FROM drafts WHERE user_id = ?`)
    .get(userId) as DraftRow | undefined;
}

export interface SaveDraftInput {
  contentMd?: string;
  mood?: string | null;
  moodColor?: string | null;
  visibility?: number;
  diaryId?: number | null;
}

export function saveDraft(userId: number, patch: SaveDraftInput): DraftRow {
  const db = getDb();

  db.raw
    .prepare(
      `INSERT INTO drafts
         (user_id, diary_id, content_md, mood, mood_color, visibility, updated_at)
       VALUES (@userId, @diaryId, @contentMd, @mood, @moodColor, @visibility, @ts)
       ON CONFLICT(user_id) DO UPDATE SET
         diary_id   = excluded.diary_id,
         content_md = excluded.content_md,
         mood       = excluded.mood,
         mood_color = excluded.mood_color,
         visibility = excluded.visibility,
         updated_at = excluded.updated_at`,
    )
    .run({
      userId,
      diaryId: patch.diaryId ?? null,
      contentMd: patch.contentMd ?? "",
      mood: patch.mood ?? null,
      moodColor: patch.moodColor ?? null,
      visibility: patch.visibility ?? 0,
      ts: now(),
    });

  return db.raw
    .prepare(`SELECT * FROM drafts WHERE user_id = ?`)
    .get(userId) as DraftRow;
}

export function clearDraft(userId: number): void {
  getDb().raw.prepare(`DELETE FROM drafts WHERE user_id = ?`).run(userId);
}
