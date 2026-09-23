/**
 * 默默与幸 —— SQLite 访问层（better-sqlite3）
 *
 * 设计要点：
 *   - 单例：dev 模式 HMR 会重复执行模块，用 globalThis 缓存避免开出多个连接
 *   - WAL + BEGIN IMMEDIATE + busy_timeout（见 schema.ts 注释）
 *   - foreign_keys 显式打开
 *
 * ⚠️ 文件操作不要放进事务：文件系统不可回滚，混进来只会造成
 *    「库回滚了、文件已改」的假一致。
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { SCHEMA } from "./schema";

export interface Db {
  raw: Database.Database;
  close(): void;
}

export const DB_PATH =
  process.env.DIARY_DB_PATH || path.join(process.cwd(), "data", "diary.db");

/** dev 模式 HMR 会重新执行模块，用 globalThis 兜住单例 */
const g = globalThis as unknown as { __momoDb?: Db };

export function getDb(): Db {
  if (g.__momoDb) return g.__momoDb;

  const dir = path.dirname(DB_PATH);
  if (dir && dir !== "." && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const raw = new Database(DB_PATH);
  raw.pragma("busy_timeout = 5000");
  raw.exec(SCHEMA);

  const db: Db = {
    raw,
    close() {
      try {
        raw.close();
      } catch {
        /* 已关闭 */
      }
    },
  };
  g.__momoDb = db;
  return db;
}

/**
 * 在一个立即写事务里执行 fn。
 *
 * 用 BEGIN IMMEDIATE 而不是裸 BEGIN：后者是延迟事务，第一条读语句先拿读锁，
 * 之后要写时再升级——两个连接同时升级就会撞 SQLITE_BUSY（且 busy_timeout
 * 对「锁升级死锁」无效，SQLite 会直接返回错误）。IMMEDIATE 一开始就拿写锁，
 * 配合 busy_timeout 变成「排队」而不是「失败」。
 */
export function tx<T>(db: Db, fn: () => T): T {
  db.raw.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.raw.exec("COMMIT");
    return out;
  } catch (err) {
    try {
      db.raw.exec("ROLLBACK");
    } catch {
      /* 回滚失败时保留原始错误 */
    }
    throw err;
  }
}

/** 当前时间的 ISO8601 UTC 字符串（字典序 == 时间序，可直接用于 ORDER BY） */
export function now(): string {
  return new Date().toISOString();
}
