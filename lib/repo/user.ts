/**
 * 用户数据访问
 */

import { hashPassword } from "../auth";
import { getDb, now, tx } from "../db";
import type { UserRow } from "../types";

export function findUserByEmail(email: string): UserRow | undefined {
  return getDb()
    .raw.prepare(`SELECT * FROM users WHERE email = ?`)
    .get(email.trim().toLowerCase()) as UserRow | undefined;
}

export function findUserById(id: number): UserRow | undefined {
  return getDb()
    .raw.prepare(`SELECT * FROM users WHERE id = ?`)
    .get(id) as UserRow | undefined;
}

export function findUserByNickname(nickname: string): UserRow | undefined {
  return getDb()
    .raw.prepare(`SELECT * FROM users WHERE nickname = ?`)
    .get(nickname.trim()) as UserRow | undefined;
}

/** 某个邀请码已被使用了几次（靠 users.invite_code 统计） */
export function countInviteUsage(code: string): number {
  const row = getDb()
    .raw.prepare(`SELECT COUNT(*) AS n FROM users WHERE invite_code = ?`)
    .get(code) as { n: number };
  return row.n;
}

export interface CreateUserInput {
  email: string;
  password: string;
  nickname: string;
  inviteCode?: string | null;
  avatar?: string;
}

/** 建用户。邮箱唯一冲突会抛 SQLITE_CONSTRAINT_UNIQUE，调用方需捕获 */
export function createUser(input: CreateUserInput): UserRow {
  const db = getDb();
  const { salt, hash } = hashPassword(input.password);
  const ts = now();

  return tx(db, () => {
    const info = db.raw
      .prepare(
        `INSERT INTO users
           (email, password_hash, password_salt, nickname, avatar, avatar_kind,
            invite_code, theme, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'preset', ?, 'strawberry', 'active', ?, ?)`,
      )
      .run(
        input.email.trim().toLowerCase(),
        hash,
        salt,
        input.nickname.trim(),
        input.avatar ?? "cloud",
        input.inviteCode ?? null,
        ts,
        ts,
      );

    return findUserById(Number(info.lastInsertRowid))!;
  });
}

export function touchLastLogin(userId: number): void {
  getDb()
    .raw.prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`)
    .run(now(), userId);
}

export function updateProfile(
  userId: number,
  patch: { nickname?: string; avatar?: string; avatarKind?: string },
): void {
  const sets: string[] = [];
  const args: unknown[] = [];

  if (patch.nickname !== undefined) {
    sets.push("nickname = ?");
    args.push(patch.nickname.trim());
  }
  if (patch.avatar !== undefined) {
    sets.push("avatar = ?");
    args.push(patch.avatar);
  }
  if (patch.avatarKind !== undefined) {
    sets.push("avatar_kind = ?");
    args.push(patch.avatarKind);
  }
  if (sets.length === 0) return;

  sets.push("updated_at = ?");
  args.push(now(), userId);

  getDb()
    .raw.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`)
    .run(...args);
}

export function updateTheme(userId: number, theme: string): void {
  getDb()
    .raw.prepare(`UPDATE users SET theme = ?, updated_at = ? WHERE id = ?`)
    .run(theme, now(), userId);
}

/** 用户列表（供好友页搜索用），排除自己 */
export function searchUsers(keyword: string, excludeId: number, limit = 20) {
  const like = `%${keyword.trim()}%`;
  return getDb()
    .raw.prepare(
      `SELECT id, nickname, avatar, avatar_kind
         FROM users
        WHERE status = 'active' AND id != ?
          AND (nickname LIKE ? OR email LIKE ?)
        ORDER BY id DESC
        LIMIT ?`,
    )
    .all(excludeId, like, like, limit) as Array<{
    id: number;
    nickname: string;
    avatar: string;
    avatar_kind: string;
  }>;
}
