/**
 * 默默与幸 —— 数据库 schema（内嵌常量）
 *
 * 为什么不放独立的 .sql 文件：Next.js standalone 构建不会把 .sql 带进产物，
 * 运行时 readFileSync 会直接炸。内嵌成字符串，打包后一定在。
 *
 * 并发要点（沿用 xingya-tavern 的结论）：
 *   - WAL：读不阻塞写
 *   - 写操作走 BEGIN IMMEDIATE，避免「读事务升级写锁」撞 SQLITE_BUSY
 *   - busy_timeout 5s，容忍瞬时争用
 *
 * ⚠️ foreign_keys = ON 必须显式打开。SQLite 默认关闭，
 *    不开则 ON DELETE CASCADE 静默失效（删了 users，diaries 全残留）。
 */

export const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------
-- 用户
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    email           TEXT    NOT NULL UNIQUE,          -- 小写规范化后存
    password_hash   TEXT    NOT NULL,                 -- scrypt hex
    password_salt   TEXT    NOT NULL,                 -- 16 字节 hex
    nickname        TEXT    NOT NULL,
    avatar          TEXT    NOT NULL DEFAULT 'cloud', -- 预设头像 key 或上传路径
    avatar_kind     TEXT    NOT NULL DEFAULT 'preset',-- preset | upload
    invite_code     TEXT,                             -- 注册时用的邀请码
    theme           TEXT    NOT NULL DEFAULT 'strawberry',
    status          TEXT    NOT NULL DEFAULT 'active',-- active | disabled
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL,
    last_login_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ---------------------------------------------------------------
-- 会话：服务端可撤销（登出 / 封禁 / 改密立即失效）
-- 只存 sha256(token)，不存明文
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    token_hash    TEXT    PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TEXT    NOT NULL,
    expires_at    TEXT    NOT NULL,
    ip            TEXT,
    user_agent    TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exp  ON sessions(expires_at);

-- ---------------------------------------------------------------
-- 日记
--   visibility: 0 公开 | 1 仅自己 | 2 仅好友
--   mood_color 存 key 不存 hex —— 换皮肤时历史日记颜色自动跟随
--   deleted_at 软删，保证时间轴翻页不跳行
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diaries (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_md   TEXT    NOT NULL DEFAULT '',
    mood         TEXT,                                -- 心情短码，如 happy
    mood_color   TEXT,                                -- 色卡 key，如 sakura
    visibility   INTEGER NOT NULL DEFAULT 0,
    is_draft     INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL,
    deleted_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_diary_timeline ON diaries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diary_vis      ON diaries(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diary_alive    ON diaries(deleted_at, created_at DESC);

-- ---------------------------------------------------------------
-- 标签（每用户独立命名空间）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    created_at  TEXT    NOT NULL,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS diary_tags (
    diary_id INTEGER NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
    PRIMARY KEY (diary_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_dtags_tag ON diary_tags(tag_id);

-- ---------------------------------------------------------------
-- 草稿：每用户一份当前草稿（UNIQUE user_id）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drafts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    diary_id    INTEGER,                              -- 编辑已有日记时指向它
    content_md  TEXT    NOT NULL DEFAULT '',
    mood        TEXT,
    mood_color  TEXT,
    visibility  INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT    NOT NULL
);

-- ---------------------------------------------------------------
-- 关注：单向。A 关注 B 且 B 关注 A == 好友（不建 friendships 表，
-- 避免两份数据打架）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT    NOT NULL,
    PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_pair ON follows(follower_id, followee_id);

-- ---------------------------------------------------------------
-- 审计日志：登录 / 改密 / 注册等关键动作
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_type  TEXT    NOT NULL,                     -- user | system
    actor_id    INTEGER,
    action      TEXT    NOT NULL,                     -- 如 user.login
    target_type TEXT,
    target_id   INTEGER,
    detail      TEXT,
    ip          TEXT,
    created_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_logs_created ON audit_logs(created_at DESC);
`;
