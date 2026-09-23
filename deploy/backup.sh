#!/bin/sh
# 默默与幸 —— 数据备份
#
# ============================================================
# 为什么不能直接 cp diary.db
# ============================================================
# 库是 WAL 模式（见 lib/schema.ts 的 `PRAGMA journal_mode = WAL`）。
# 实测这台服务器上的现象：
#
#   diary.db        4096 字节     <- 只有文件头，几乎是个空壳
#   diary.db-shm   32768 字节     <- 共享内存索引
#   diary.db-wal  247232 字节     <- 表结构 + 数据实际都在这里
#
# 所以「只拷 diary.db」会得到一个几乎是空的库，而且看起来一切正常 ——
# 这正是最危险的那种备份。必须走 SQLite 官方的在线备份 API，
# 它自己会处理 WAL，产出单个一致的 .db 文件。
#
# better-sqlite3 自带这个 API（db.backup()），而它已经在容器里了
# （standalone 产物内含），不需要额外装 sqlite3 命令行工具。
#
# ============================================================
# 用法
# ============================================================
#   sh /opt/momo/deploy/backup.sh          # 备份一次
#   KEEP=30 sh /opt/momo/deploy/backup.sh  # 保留最近 30 份（默认 14）
#
# 产出：/opt/momo/backups/diary-<时间戳>.db   单个文件，可直接拿走
#
# ============================================================

set -eu

APP_DIR="${APP_DIR:-/opt/momo}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
CONTAINER="${CONTAINER:-momo}"
KEEP="${KEEP:-14}"

STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_DIR/diary-$STAMP.db"

mkdir -p "$BACKUP_DIR"

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*"; }

# ---------------------------------------------------------------- 前置检查
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  log "错误：容器 $CONTAINER 没在运行，无法热备。"
  log "若确实已停服，可改用冷备：tar czf $BACKUP_DIR/cold-$STAMP.tar.gz -C $APP_DIR data .env"
  exit 1
fi

# ---------------------------------------------------------------- 热备
log "开始热备 -> $TARGET"

docker exec "$CONTAINER" node -e '
  const Database = require("better-sqlite3");
  const src = process.argv[1];
  const dst = process.argv[2];
  const fs = require("fs");
  if (!fs.existsSync(src)) {
    console.error("源库不存在：" + src);
    process.exit(2);
  }
  const db = new Database(src, { readonly: true });
  db.backup(dst)
    .then(() => { db.close(); process.exit(0); })
    .catch((err) => { console.error(String(err)); process.exit(1); });
' /app/data/diary.db "/app/backups/diary-$STAMP.db"

# ---------------------------------------------------------------- 校验
# 备份完立刻开一遍并跑完整性检查 —— 没验过的备份等于没有备份。
docker exec "$CONTAINER" node -e '
  const Database = require("better-sqlite3");
  const db = new Database(process.argv[1], { readonly: true });
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = ?").all("table");
  const users = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  const diaries = db.prepare("SELECT COUNT(*) AS n FROM diaries").get().n;
  console.log("  完整性: " + db.pragma("integrity_check", { simple: true }));
  console.log("  表数量: " + rows.length);
  console.log("  用户数: " + users);
  console.log("  日记数: " + diaries);
  db.close();
' "/app/backups/diary-$STAMP.db"

# 容器内看不到宿主机的属主，这里再确认一次文件真的落盘了
SIZE="$(du -h "$TARGET" | cut -f1)"
log "完成：$TARGET（$SIZE）"

# ---------------------------------------------------------------- 备份密钥
# SESSION_SECRET 丢了不会丢数据，但所有用户会被强制登出。
# 单独存一份，权限收紧。
if [ -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env" "$BACKUP_DIR/env-$STAMP.bak"
  chmod 600 "$BACKUP_DIR/env-$STAMP.bak"
  log "已备份 .env（含 SESSION_SECRET）-> env-$STAMP.bak"
fi

# ---------------------------------------------------------------- 轮转
COUNT="$(ls -1 "$BACKUP_DIR"/diary-*.db 2>/dev/null | wc -l)"
if [ "$COUNT" -gt "$KEEP" ]; then
  log "现有 $COUNT 份，超过上限 $KEEP，清理最旧的 $((COUNT - KEEP)) 份"
  ls -1t "$BACKUP_DIR"/diary-*.db | tail -n "$((COUNT - KEEP))" | while read -r f; do
    rm -f "$f"
    log "  已删除 $(basename "$f")"
  done
fi

# env 备份同样轮转，避免堆积
ENV_COUNT="$(ls -1 "$BACKUP_DIR"/env-*.bak 2>/dev/null | wc -l)"
if [ "$ENV_COUNT" -gt "$KEEP" ]; then
  ls -1t "$BACKUP_DIR"/env-*.bak | tail -n "$((ENV_COUNT - KEEP))" | while read -r f; do
    rm -f "$f"
  done
fi

log "当前共 $(ls -1 "$BACKUP_DIR"/diary-*.db 2>/dev/null | wc -l) 份备份"
