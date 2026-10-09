/**
 * 日记数据访问
 *
 * 权限是这个项目的安全核心，全部收敛在本文件的 SQL 里 ——
 * 不依赖调用方记得加过滤条件。
 *
 * 可见性规则（对 viewer 而言）：
 *   visibility = 1（仅自己）  → 只有作者本人可见
 *   visibility = 2（仅好友）  → 作者本人 + 与作者互关的人可见
 *   visibility = 0（公开）    → 所有人可见
 */

import { getDb, now, tx } from "../db";
import type { DiaryRow, DiaryWithMeta } from "../types";

/** 互关判定：f1 是「我关注作者」，f2 是「作者关注我」，两条都在才是好友 */
const FRIEND_EXISTS = `
  EXISTS (
    SELECT 1
      FROM follows f1
      JOIN follows f2
        ON f1.follower_id = f2.followee_id
       AND f1.followee_id = f2.follower_id
     WHERE f1.follower_id = @me
       AND f1.followee_id = d.user_id
  )`;

/** 一段 SQL 里能看哪些日记 */
function visibilityClause(): string {
  return `
    d.deleted_at IS NULL
    AND d.is_draft = 0
    AND (
      d.user_id = @me
      OR d.visibility = 0
      OR (d.visibility = 2 AND ${FRIEND_EXISTS})
    )`;
}

/**
 * 爱心（已读）聚合列。
 *
 * 用两个相关子查询而不是 JOIN + GROUP BY —— 后者在列表里还要和 tags 的
 * 聚合叠加，很容易写出「笛卡尔积把计数放大」的隐藏 bug。子查询各自独立，
 * 结果可预期，而且 (diary_id) 上有索引，代价很低。
 */
const HEART_COLUMNS = `
  (SELECT COUNT(*) FROM diary_hearts h WHERE h.diary_id = d.id) AS heart_count,
  EXISTS (
    SELECT 1 FROM diary_hearts h2
     WHERE h2.diary_id = d.id AND h2.user_id = @me
  ) AS hearted_by_me`;

export interface TimelineOptions {
  viewerId: number;
  limit?: number;
  /** 游标：取此时间之前的（ISO 字符串） */
  before?: string;
  /** 按标签筛选 */
  tagName?: string;
  /** 只看某人的 */
  authorId?: number;
  /** 按心情筛选 */
  mood?: string;
}

/** 时间轴：返回对 viewer 可见的日记，附作者信息与标签 */
export function listTimeline(opts: TimelineOptions): DiaryWithMeta[] {
  const db = getDb();
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);

  const where: string[] = [visibilityClause()];
  const params: Record<string, unknown> = { me: opts.viewerId, limit };

  if (opts.before) {
    where.push("d.created_at < @before");
    params.before = opts.before;
  }
  if (opts.authorId) {
    where.push("d.user_id = @authorId");
    params.authorId = opts.authorId;
  }
  if (opts.mood) {
    where.push("d.mood = @mood");
    params.mood = opts.mood;
  }
  if (opts.tagName) {
    where.push(`EXISTS (
      SELECT 1 FROM diary_tags dt
        JOIN tags t ON t.id = dt.tag_id
       WHERE dt.diary_id = d.id AND t.name = @tagName AND t.user_id = d.user_id
    )`);
    params.tagName = opts.tagName;
  }

  const rows = db.raw
    .prepare(
      `SELECT d.*,
              u.nickname    AS author_nickname,
              u.avatar      AS author_avatar,
              u.avatar_kind AS author_avatar_kind,
              ${HEART_COLUMNS}
         FROM diaries d
         JOIN users u ON u.id = d.user_id
        WHERE ${where.join(" AND ")}
        ORDER BY d.created_at DESC
        LIMIT @limit`,
    )
    .all(params) as Array<HeartMeta & {
    author_nickname: string;
    author_avatar: string;
    author_avatar_kind: string;
  }>;

  return attachTags(rows);
}

/** 带爱心的查询结果行 */
type HeartMeta = DiaryRow & { heart_count: number; hearted_by_me: number };

/** 给一批日记补上标签数组（一次查询，避免 N+1） */
function attachTags(
  rows: Array<
    HeartMeta & {
      author_nickname: string;
      author_avatar: string;
      author_avatar_kind: string;
    }
  >,
): DiaryWithMeta[] {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");
  const tagRows = getDb()
    .raw.prepare(
      `SELECT dt.diary_id, t.name
         FROM diary_tags dt
         JOIN tags t ON t.id = dt.tag_id
        WHERE dt.diary_id IN (${placeholders})
        ORDER BY t.name`,
    )
    .all(...ids) as Array<{ diary_id: number; name: string }>;

  const byDiary = new Map<number, string[]>();
  for (const t of tagRows) {
    const list = byDiary.get(t.diary_id) ?? [];
    list.push(t.name);
    byDiary.set(t.diary_id, list);
  }

  return rows.map((r) => ({
    ...r,
    tags: byDiary.get(r.id) ?? [],
    heart_count: r.heart_count ?? 0,
    hearted_by_me: !!r.hearted_by_me,
  }));
}

/** 单篇详情。返回 null 表示不存在或无权查看（不区分，避免泄露存在性） */
export function getDiaryForViewer(
  diaryId: number,
  viewerId: number,
): DiaryWithMeta | null {
  const rows = getDb()
    .raw.prepare(
      `SELECT d.*,
              u.nickname    AS author_nickname,
              u.avatar      AS author_avatar,
              u.avatar_kind AS author_avatar_kind,
              ${HEART_COLUMNS}
         FROM diaries d
         JOIN users u ON u.id = d.user_id
        WHERE d.id = @id AND ${visibilityClause()}`,
    )
    .all({ id: diaryId, me: viewerId }) as Array<
    HeartMeta & {
      author_nickname: string;
      author_avatar: string;
      author_avatar_kind: string;
    }
  >;

  const withTags = attachTags(rows);
  return withTags[0] ?? null;
}

/** 取日记原始行（不做权限判断，仅供作者本人的写操作使用） */
export function getOwnDiary(diaryId: number, userId: number): DiaryRow | undefined {
  return getDb()
    .raw.prepare(`SELECT * FROM diaries WHERE id = ? AND user_id = ?`)
    .get(diaryId, userId) as DiaryRow | undefined;
}

export interface CreateDiaryInput {
  userId: number;
  contentMd: string;
  mood?: string | null;
  moodColor?: string | null;
  visibility?: number;
  tags?: string[];
  /** 允许指定创建时间（导入用） */
  createdAt?: string;
}

export function createDiary(input: CreateDiaryInput): DiaryRow {
  const db = getDb();
  const ts = input.createdAt ?? now();

  return tx(db, () => {
    const info = db.raw
      .prepare(
        `INSERT INTO diaries
           (user_id, content_md, mood, mood_color, visibility, is_draft, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .run(
        input.userId,
        input.contentMd,
        input.mood ?? null,
        input.moodColor ?? null,
        input.visibility ?? 0,
        ts,
        ts,
      );

    const id = Number(info.lastInsertRowid);
    if (input.tags?.length) setDiaryTags(id, input.userId, input.tags);

    return db.raw.prepare(`SELECT * FROM diaries WHERE id = ?`).get(id) as DiaryRow;
  });
}

export interface UpdateDiaryInput {
  contentMd?: string;
  mood?: string | null;
  moodColor?: string | null;
  visibility?: number;
  tags?: string[];
}

export function updateDiary(
  diaryId: number,
  userId: number,
  patch: UpdateDiaryInput,
): DiaryRow | undefined {
  const db = getDb();

  return tx(db, () => {
    const existing = db.raw
      .prepare(`SELECT * FROM diaries WHERE id = ? AND user_id = ?`)
      .get(diaryId, userId) as DiaryRow | undefined;
    if (!existing) return undefined;

    const sets: string[] = [];
    const args: unknown[] = [];

    if (patch.contentMd !== undefined) {
      sets.push("content_md = ?");
      args.push(patch.contentMd);
    }
    if (patch.mood !== undefined) {
      sets.push("mood = ?");
      args.push(patch.mood);
    }
    if (patch.moodColor !== undefined) {
      sets.push("mood_color = ?");
      args.push(patch.moodColor);
    }
    if (patch.visibility !== undefined) {
      sets.push("visibility = ?");
      args.push(patch.visibility);
    }
    if (sets.length > 0) {
      sets.push("updated_at = ?");
      args.push(now(), diaryId, userId);
      db.raw
        .prepare(`UPDATE diaries SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`)
        .run(...args);
    }

    if (patch.tags !== undefined) setDiaryTags(diaryId, userId, patch.tags);

    return db.raw.prepare(`SELECT * FROM diaries WHERE id = ?`).get(diaryId) as DiaryRow;
  });
}

/** 软删：保留行，时间轴翻页不会跳行 */
export function softDeleteDiary(diaryId: number, userId: number): boolean {
  const r = getDb()
    .raw.prepare(
      `UPDATE diaries SET deleted_at = ?, updated_at = ?
        WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    )
    .run(now(), now(), diaryId, userId);
  return r.changes > 0;
}

export function restoreDiary(diaryId: number, userId: number): boolean {
  const r = getDb()
    .raw.prepare(
      `UPDATE diaries SET deleted_at = NULL, updated_at = ?
        WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL`,
    )
    .run(now(), diaryId, userId);
  return r.changes > 0;
}

// ---------------------------------------------------------------- 标签

/** 覆盖式设置某篇日记的标签（自动创建不存在的标签） */
export function setDiaryTags(diaryId: number, userId: number, names: string[]): void {
  const db = getDb();
  const clean = Array.from(
    new Set(names.map((n) => n.trim()).filter(Boolean)),
  );

  db.raw.prepare(`DELETE FROM diary_tags WHERE diary_id = ?`).run(diaryId);

  for (const name of clean) {
    let tag = db.raw
      .prepare(`SELECT id FROM tags WHERE user_id = ? AND name = ?`)
      .get(userId, name) as { id: number } | undefined;

    if (!tag) {
      const info = db.raw
        .prepare(`INSERT INTO tags (user_id, name, created_at) VALUES (?, ?, ?)`)
        .run(userId, name, now());
      tag = { id: Number(info.lastInsertRowid) };
    }

    db.raw
      .prepare(`INSERT OR IGNORE INTO diary_tags (diary_id, tag_id) VALUES (?, ?)`)
      .run(diaryId, tag.id);
  }
}

/** 某用户的标签 + 使用次数 */
export function listTagsWithCount(userId: number) {
  return getDb()
    .raw.prepare(
      `SELECT t.id, t.name, COUNT(dt.diary_id) AS count
         FROM tags t
         LEFT JOIN diary_tags dt ON dt.tag_id = t.id
         LEFT JOIN diaries d ON d.id = dt.diary_id AND d.deleted_at IS NULL
        WHERE t.user_id = ?
        GROUP BY t.id, t.name
        ORDER BY count DESC, t.name`,
    )
    .all(userId) as Array<{ id: number; name: string; count: number }>;
}

/** 统计：总篇数、本月篇数 */
export function getStats(userId: number) {
  const db = getDb();
  const total = db.raw
    .prepare(
      `SELECT COUNT(*) AS n FROM diaries
        WHERE user_id = ? AND deleted_at IS NULL AND is_draft = 0`,
    )
    .get(userId) as { n: number };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const month = db.raw
    .prepare(
      `SELECT COUNT(*) AS n FROM diaries
        WHERE user_id = ? AND deleted_at IS NULL AND is_draft = 0 AND created_at >= ?`,
    )
    .get(userId, monthStart.toISOString()) as { n: number };

  return { total: total.n, month: month.n };
}

// ---------------------------------------------------------------- 爱心（已读）

/**
 * 切换爱心。
 *
 * 权限收敛在这里：只有当 viewer 满足 visibilityClause（能看见这篇说说）时
 * 才允许操作。作者本人除外 —— 给自己的说说点「已读」没有意义，直接拒绝。
 *
 * 返回 null 表示无权操作 / 日记不存在（与「看不见」统一处理，不泄露存在性）。
 */
export function toggleHeart(
  diaryId: number,
  userId: number,
): { hearted: boolean; heartCount: number } | null {
  const db = getDb();

  return tx(db, () => {
    const visible = db.raw
      .prepare(
        `SELECT d.user_id FROM diaries d
          WHERE d.id = @id AND ${visibilityClause()}`,
      )
      .get({ id: diaryId, me: userId }) as { user_id: number } | undefined;

    if (!visible) return null;
    // 作者不能给自己点爱心（已读回执对自己无意义）
    if (visible.user_id === userId) return null;

    const existing = db.raw
      .prepare(
        `SELECT 1 AS x FROM diary_hearts WHERE diary_id = ? AND user_id = ?`,
      )
      .get(diaryId, userId);

    if (existing) {
      db.raw
        .prepare(`DELETE FROM diary_hearts WHERE diary_id = ? AND user_id = ?`)
        .run(diaryId, userId);
    } else {
      db.raw
        .prepare(
          `INSERT INTO diary_hearts (diary_id, user_id, created_at) VALUES (?, ?, ?)`,
        )
        .run(diaryId, userId, now());
    }

    const count = db.raw
      .prepare(`SELECT COUNT(*) AS n FROM diary_hearts WHERE diary_id = ?`)
      .get(diaryId) as { n: number };

    return { hearted: !existing, heartCount: count.n };
  });
}
