/**
 * 默默与幸 —— 数据库行类型
 */

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  password_salt: string;
  nickname: string;
  avatar: string;
  avatar_kind: string;
  invite_code: string | null;
  theme: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

/** 去掉密码字段，可安全下发到前端 */
export type PublicUser = Omit<UserRow, "password_hash" | "password_salt">;

export function toPublicUser(u: UserRow): PublicUser {
  const { password_hash: _h, password_salt: _s, ...rest } = u;
  return rest;
}

export interface SessionRow {
  token_hash: string;
  user_id: number;
  created_at: string;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
}

export interface DiaryRow {
  id: number;
  user_id: number;
  content_md: string;
  mood: string | null;
  mood_color: string | null;
  visibility: number;
  is_draft: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TagRow {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
}

export interface DraftRow {
  id: number;
  user_id: number;
  diary_id: number | null;
  content_md: string;
  mood: string | null;
  mood_color: string | null;
  visibility: number;
  updated_at: string;
}

/** 时间轴条目：日记 + 作者信息 + 标签 */
export interface DiaryWithMeta extends DiaryRow {
  author_nickname: string;
  author_avatar: string;
  author_avatar_kind: string;
  tags: string[];
}
