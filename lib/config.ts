/**
 * 默默与幸 —— 站点配置
 */

export const SITE_NAME = "默默与幸";
export const SITE_TAGLINE = "把碎碎念，轻轻放下";

export const COOKIE_NAME = "momo_session";
export const SESSION_TTL_MS = 7 * 24 * 3600 * 1000; // 7 天

/** 登录失败限流 */
export const LOGIN_MAX_FAILURES = 10;
export const LOGIN_LOCK_MS = 5 * 60 * 1000; // 锁 5 分钟

/** 内容长度上限 */
export const MAX_DIARY_LENGTH = 20000;
export const MAX_NICKNAME_LENGTH = 20;
export const MAX_TAG_NAME_LENGTH = 12;
export const MAX_TAGS_PER_DIARY = 8;

/**
 * 邀请码。
 *
 * 格式：`code:maxUses,code2:maxUses`，maxUses 为 0 表示不限次数。
 * 例：`momo:0,friend:5`
 *
 * 默认值仅用于本地开发；生产请在 .env 里覆盖。
 */
export const DEFAULT_INVITE_CODES = "momo:0";

export interface InviteCode {
  code: string;
  maxUses: number; // 0 = 不限
}

export function parseInviteCodes(raw: string): InviteCode[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [code, uses] = entry.split(":");
      const maxUses = Number.parseInt(uses ?? "1", 10);
      return {
        code: (code ?? "").trim(),
        maxUses: Number.isFinite(maxUses) && maxUses > 0 ? maxUses : 0,
      };
    })
    .filter((c) => c.code.length > 0);
}

export function getInviteCodes(): InviteCode[] {
  return parseInviteCodes(process.env.INVITE_CODES || DEFAULT_INVITE_CODES);
}

/** 预设软萌头像 key（对应 public/avatars/*.svg） */
export const PRESET_AVATARS = [
  "cloud",
  "peach",
  "sprout",
  "star",
  "moon",
  "bunny",
] as const;

export type PresetAvatar = (typeof PRESET_AVATARS)[number];

export function isValidAvatar(key: string): key is PresetAvatar {
  return (PRESET_AVATARS as readonly string[]).includes(key);
}

/** 主题皮肤。preview 只用于切换器上的色点（真实配色在 globals.css） */
export const THEMES = [
  { key: "strawberry", label: "草莓牛奶", preview: "#f4a0b8" },
  { key: "matcha", label: "抹茶拿铁", preview: "#94c28f" },
  { key: "starry", label: "星空紫", preview: "#b19be4" },
  { key: "lemon", label: "柠檬汽水", preview: "#f2c75c" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];

export const DEFAULT_THEME: ThemeKey = "strawberry";

export function isValidTheme(key: string): key is ThemeKey {
  return THEMES.some((t) => t.key === key);
}

/** 可见性档位 */
export const VISIBILITY = {
  PUBLIC: 0,
  PRIVATE: 1,
  FRIENDS: 2,
} as const;

export type VisibilityValue = (typeof VISIBILITY)[keyof typeof VISIBILITY];

export const VISIBILITY_LABELS: Record<number, string> = {
  0: "公开",
  1: "仅自己",
  2: "仅好友",
};

export function isValidVisibility(v: unknown): v is VisibilityValue {
  return v === 0 || v === 1 || v === 2;
}

/** 心情：短码 + 色卡 key（色卡只存 key，颜色由皮肤决定） */
export const MOODS = [
  { key: "happy", emoji: "🌸", label: "开心", color: "sakura" },
  { key: "calm", emoji: "🍃", label: "平静", color: "mint" },
  { key: "tired", emoji: "☁️", label: "疲惫", color: "cloud" },
  { key: "sad", emoji: "🌧️", label: "难过", color: "rain" },
  { key: "angry", emoji: "🔥", label: "生气", color: "flame" },
  { key: "excited", emoji: "⭐", label: "兴奋", color: "sunny" },
] as const;

export type MoodKey = (typeof MOODS)[number]["key"];

export function findMood(key: string | null | undefined) {
  if (!key) return null;
  return MOODS.find((m) => m.key === key) ?? null;
}

export function isValidMood(key: unknown): key is MoodKey {
  return typeof key === "string" && MOODS.some((m) => m.key === key);
}
