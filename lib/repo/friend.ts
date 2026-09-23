/**
 * 关注 / 好友数据访问
 *
 * 只有单向关注（follows 表），好友 = 双向关注。
 * 不建独立的 friendships 表 —— 两份数据必然会出现「一份删了一份没删」的脏状态。
 */

import { getDb, now } from "../db";

export interface UserBrief {
  id: number;
  nickname: string;
  avatar: string;
  avatar_kind: string;
  created_at?: string;
}

export function follow(followerId: number, followeeId: number): void {
  if (followerId === followeeId) return;
  getDb()
    .raw.prepare(
      `INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at)
       VALUES (?, ?, ?)`,
    )
    .run(followerId, followeeId, now());
}

export function unfollow(followerId: number, followeeId: number): void {
  getDb()
    .raw.prepare(`DELETE FROM follows WHERE follower_id = ? AND followee_id = ?`)
    .run(followerId, followeeId);
}

export function isFollowing(followerId: number, followeeId: number): boolean {
  const row = getDb()
    .raw.prepare(
      `SELECT 1 AS x FROM follows WHERE follower_id = ? AND followee_id = ?`,
    )
    .get(followerId, followeeId);
  return !!row;
}

/** 双向关注才算好友 */
export function isFriend(a: number, b: number): boolean {
  const row = getDb()
    .raw.prepare(
      `SELECT 1 AS x
         FROM follows f1
         JOIN follows f2
           ON f1.follower_id = f2.followee_id
          AND f1.followee_id = f2.follower_id
        WHERE f1.follower_id = ? AND f1.followee_id = ?`,
    )
    .get(a, b);
  return !!row;
}

/** 我关注的人（附「对方是否也关注我」） */
export function listFollowing(userId: number) {
  return getDb()
    .raw.prepare(
      `SELECT u.id, u.nickname, u.avatar, u.avatar_kind, f.created_at,
              EXISTS (
                SELECT 1 FROM follows b
                 WHERE b.follower_id = u.id AND b.followee_id = @me
              ) AS follows_back
         FROM follows f
         JOIN users u ON u.id = f.followee_id
        WHERE f.follower_id = @me AND u.status = 'active'
        ORDER BY f.created_at DESC`,
    )
    .all({ me: userId }) as Array<UserBrief & { follows_back: number }>;
}

/** 关注我的人 */
export function listFollowers(userId: number) {
  return getDb()
    .raw.prepare(
      `SELECT u.id, u.nickname, u.avatar, u.avatar_kind, f.created_at,
              EXISTS (
                SELECT 1 FROM follows b
                 WHERE b.follower_id = @me AND b.followee_id = u.id
              ) AS i_follow
         FROM follows f
         JOIN users u ON u.id = f.follower_id
        WHERE f.followee_id = @me AND u.status = 'active'
        ORDER BY f.created_at DESC`,
    )
    .all({ me: userId }) as Array<UserBrief & { i_follow: number }>;
}

/** 互相都是好友的人 */
export function listFriends(userId: number): UserBrief[] {
  return getDb()
    .raw.prepare(
      `SELECT u.id, u.nickname, u.avatar, u.avatar_kind
         FROM follows f1
         JOIN follows f2
           ON f1.follower_id = f2.followee_id
          AND f1.followee_id = f2.follower_id
         JOIN users u ON u.id = f1.followee_id
        WHERE f1.follower_id = ? AND u.status = 'active'
        ORDER BY u.nickname`,
    )
    .all(userId) as UserBrief[];
}

export function countFriends(userId: number): number {
  const row = getDb()
    .raw.prepare(
      `SELECT COUNT(*) AS n
         FROM follows f1
         JOIN follows f2
           ON f1.follower_id = f2.followee_id
          AND f1.followee_id = f2.follower_id
        WHERE f1.follower_id = ?`,
    )
    .get(userId) as { n: number };
  return row.n;
}
