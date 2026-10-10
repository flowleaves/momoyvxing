/**
 * 回复数据访问
 *
 * 回复的权限完全跟着日记走：能看见日记才能看见 / 写它的回复。
 * 判定复用 diary repo 的 getVisibleDiaryAuthor()，不在这里重写一份
 * 可见性 SQL —— 两份实现迟早会走歪，而权限写歪是安全事故。
 */

import { getDb, now, tx } from "../db";
import { decorateReplyTimes } from "../format";
import type { ReplyForClient, ReplyWithMeta } from "../types";

import { getVisibleDiaryAuthor } from "./diary";

/**
 * 某篇日记的回复，按时间**正序**（先说的在上面 —— 对话的自然读序）。
 *
 * 不返回软删的；不分页（回复量很小，一次拉完更简单，也省掉前端拼接）。
 * 时间标签在这里就算好（服务端），客户端组件只负责渲染。
 */
export function listReplies(
  diaryId: number,
  viewerId: number,
): ReplyForClient[] {
  // 先过权限：看不见日记就当作没有任何回复可看
  if (!getVisibleDiaryAuthor(diaryId, viewerId)) return [];

  const rows = getDb()
    .raw.prepare(
      `SELECT r.*,
              u.nickname    AS author_nickname,
              u.avatar      AS author_avatar,
              u.avatar_kind AS author_avatar_kind
         FROM diary_replies r
         JOIN users u ON u.id = r.user_id
        WHERE r.diary_id = ? AND r.deleted_at IS NULL
        ORDER BY r.created_at ASC, r.id ASC`,
    )
    .all(diaryId) as ReplyWithMeta[];

  return rows.map(decorateReplyTimes);
}

/**
 * 批量取多篇日记的回复，按 diary_id 归组。用于时间轴一次性渲染所有卡片的回复。
 *
 * 一次查询搞定 —— 逐篇调用会是 N+1（列表 20 篇就是 20 次往返）。
 * 权限已经在取日记列表时判过了：列表里的日记本就是 viewer 能看见的，
 * 所以这里不再重复做可见性校验（也免得再引入一次 N+1）。
 */
export function listRepliesForDiaries(
  diaryIds: number[],
): Map<number, ReplyForClient[]> {
  const out = new Map<number, ReplyForClient[]>();
  if (diaryIds.length === 0) return out;

  const placeholders = diaryIds.map(() => "?").join(",");
  const rows = getDb()
    .raw.prepare(
      `SELECT r.*,
              u.nickname    AS author_nickname,
              u.avatar      AS author_avatar,
              u.avatar_kind AS author_avatar_kind
         FROM diary_replies r
         JOIN users u ON u.id = r.user_id
        WHERE r.diary_id IN (${placeholders}) AND r.deleted_at IS NULL
        ORDER BY r.created_at ASC, r.id ASC`,
    )
    .all(...diaryIds) as ReplyWithMeta[];

  for (const r of rows) {
    const list = out.get(r.diary_id) ?? [];
    list.push(decorateReplyTimes(r));
    out.set(r.diary_id, list);
  }
  return out;
}

/**
 * 新增回复。
 *
 * 返回 null 表示日记不存在 / 无权查看 —— 与「看不见」统一处理，不泄露存在性。
 * 长度校验放在 API 层（和日记正文同一套口径），这里只负责落库。
 */
export function createReply(input: {
  diaryId: number;
  userId: number;
  contentMd: string;
}): ReplyForClient | null {
  const db = getDb();

  return tx(db, () => {
    if (!getVisibleDiaryAuthor(input.diaryId, input.userId)) return null;

    const ts = now();
    const info = db.raw
      .prepare(
        `INSERT INTO diary_replies
           (diary_id, user_id, content_md, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(input.diaryId, input.userId, input.contentMd, ts, ts);

    const row = db.raw
      .prepare(
        `SELECT r.*,
                u.nickname    AS author_nickname,
                u.avatar      AS author_avatar,
                u.avatar_kind AS author_avatar_kind
           FROM diary_replies r
           JOIN users u ON u.id = r.user_id
          WHERE r.id = ?`,
      )
      .get(info.lastInsertRowid) as ReplyWithMeta;

    // 时间标签服务端算好 —— 客户端拿到就能直接渲染
    return decorateReplyTimes(row);
  });
}

/** 某篇日记的回复条数（不含软删） */
export function countReplies(diaryId: number): number {
  const row = getDb()
    .raw.prepare(
      `SELECT COUNT(*) AS n FROM diary_replies
        WHERE diary_id = ? AND deleted_at IS NULL`,
    )
    .get(diaryId) as { n: number };
  return row.n;
}
