/**
 * 默默与幸 —— 认证与会话
 *
 * 沿用 fine-apihub 的结论：scrypt 哈希 + HMAC 签名 Cookie，不引 NextAuth。
 * 区别在于本项目的会话是**服务端可撤销**的：sessions 表存 sha256(token)，
 * 登出 / 封禁 / 改密后旧 token 立即失效。
 *
 * ⚠️ 本模块依赖 better-sqlite3，**不能**在 middleware.ts 里 import
 *    （Next 16 的 middleware 跑 Edge runtime，没有 node:sqlite）。
 *    中间件只验 Cookie 签名，真正的库校验走 getCurrentUser()。
 */

import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { cookies } from "next/headers";

import {
  COOKIE_NAME,
  LOGIN_LOCK_MS,
  LOGIN_MAX_FAILURES,
  SESSION_TTL_MS,
} from "./config";
import { DB_PATH, getDb, now } from "./db";
import type { SessionRow, UserRow } from "./types";

// ---------------------------------------------------------------- 密钥

const g = globalThis as unknown as {
  __momoSecret?: string;
  __momoFailures?: Map<string, { count: number; lockedUntil: number }>;
};

function getSecret(): string {
  if (g.__momoSecret) return g.__momoSecret;

  let secret = process.env.SESSION_SECRET?.trim() || "";
  if (!secret) {
    const file = path.join(path.dirname(DB_PATH), "session.secret");
    try {
      secret = fs.readFileSync(file, "utf8").trim();
    } catch {
      /* 首次运行，下面生成 */
    }
    if (!secret) {
      secret = randomBytes(32).toString("hex");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, secret, { mode: 0o600 });
    }
  }
  g.__momoSecret = secret;
  return secret;
}

// ---------------------------------------------------------------- 密码

export function hashPassword(
  password: string,
  salt = randomBytes(16).toString("hex"),
): { salt: string; hash: string } {
  const hash = scryptSync(String(password), salt, 32).toString("hex");
  return { salt, hash };
}

export function verifyPassword(
  password: string,
  salt: string,
  hash: string,
): boolean {
  try {
    const got = scryptSync(String(password), salt, 32);
    const want = Buffer.from(hash, "hex");
    return got.length === want.length && timingSafeEqual(got, want);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- 会话

function sign(payloadB64: string): string {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** 签发会话：写 sessions 表并返回 token */
export function issueSession(
  userId: number,
  ip?: string | null,
  userAgent?: string | null,
): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({ u: userId, exp }),
  ).toString("base64url");
  const token = `${payload}.${sign(payload)}`;

  getDb()
    .raw.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      sha256(token),
      userId,
      now(),
      new Date(exp).toISOString(),
      ip ?? null,
      userAgent ?? null,
    );

  return token;
}

/** 校验会话：先验签，再查库（保证服务端可撤销） */
export function readSession(
  token: string | null | undefined,
): { userId: number } | null {
  if (!token || typeof token !== "string") return null;

  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const want = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: { u?: number; exp?: number };
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload.u || !payload.exp || payload.exp < Date.now()) return null;

  const row = getDb()
    .raw.prepare(`SELECT * FROM sessions WHERE token_hash = ?`)
    .get(sha256(token)) as SessionRow | undefined;
  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    revokeSession(token);
    return null;
  }
  return { userId: row.user_id };
}

export function revokeSession(token: string): void {
  getDb().raw.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(sha256(token));
}

/** 改密 / 封禁时踢掉全部设备 */
export function revokeAllSessions(userId: number): void {
  getDb().raw.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
}

/** 清理过期会话（可挂到启动或定时任务上） */
export function pruneExpiredSessions(): number {
  const r = getDb()
    .raw.prepare(`DELETE FROM sessions WHERE expires_at < ?`)
    .run(now());
  return r.changes;
}

// ---------------------------------------------------------------- Cookie

export function cookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    secure,
  };
}

/** 在 Server Component / Route Handler 里拿当前登录用户 */
export async function getCurrentUser(): Promise<UserRow | null> {
  const store = await cookies();
  const sess = readSession(store.get(COOKIE_NAME)?.value);
  if (!sess) return null;

  const user = getDb()
    .raw.prepare(`SELECT * FROM users WHERE id = ? AND status = 'active'`)
    .get(sess.userId) as UserRow | undefined;
  return user ?? null;
}

/** 取当前登录用户，未登录直接抛错（供受保护的页面用） */
export async function requireUser(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

// ---------------------------------------------------------------- 登录限流

function failures() {
  if (!g.__momoFailures) g.__momoFailures = new Map();
  return g.__momoFailures;
}

export function isLocked(ip: string): boolean {
  const f = failures().get(ip);
  return !!(f && f.lockedUntil > Date.now());
}

export function recordFailure(ip: string): void {
  const f = failures().get(ip) ?? { count: 0, lockedUntil: 0 };
  f.count += 1;
  if (f.count >= LOGIN_MAX_FAILURES) {
    f.lockedUntil = Date.now() + LOGIN_LOCK_MS;
    f.count = 0;
  }
  failures().set(ip, f);
}

export function recordSuccess(ip: string): void {
  failures().delete(ip);
}

// ---------------------------------------------------------------- 审计

export function audit(opts: {
  actorType?: string;
  actorId?: number | null;
  action: string;
  targetType?: string | null;
  targetId?: number | null;
  detail?: string | null;
  ip?: string | null;
}): void {
  try {
    getDb()
      .raw.prepare(
        `INSERT INTO audit_logs
           (actor_type, actor_id, action, target_type, target_id, detail, ip, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        opts.actorType ?? "user",
        opts.actorId ?? null,
        opts.action,
        opts.targetType ?? null,
        opts.targetId ?? null,
        opts.detail ?? null,
        opts.ip ?? null,
        now(),
      );
  } catch {
    /* 审计失败不能影响主流程 */
  }
}
