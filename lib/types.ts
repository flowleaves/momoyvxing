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

/** 时间轴条目：日记 + 作者信息 + 标签 + 爱心（已读）状态 */
export interface DiaryWithMeta extends DiaryRow {
  author_nickname: string;
  author_avatar: string;
  author_avatar_kind: string;
  tags: string[];
  /** 爱心（已读）总数 */
  heart_count: number;
  /** 当前 viewer 是否已点过爱心 */
  hearted_by_me: boolean;
  /** 回复条数（不含已软删的） */
  reply_count: number;
}

export interface ReplyRow {
  id: number;
  diary_id: number;
  user_id: number;
  content_md: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** 一条回复 + 回复者信息 */
export interface ReplyWithMeta extends ReplyRow {
  author_nickname: string;
  author_avatar: string;
  author_avatar_kind: string;
}

/**
 * 下发到前端的回复。
 *
 * 时间标签在**服务端**算好带下来（`time_label` / `full_time_label`），
 * 客户端不再自己 `new Date()` —— 回复区是 Client Component，会先 SSR 再
 * hydration，「今天 / N 月 N 日」这种判断依赖当前日期，两端算的值可能不同。
 * 这与项目里 MyDiaryCard 的做法一致（时间一律由 Server Component 算好传入）。
 */
export interface ReplyForClient extends ReplyWithMeta {
  time_label: string;
  full_time_label: string;
}
