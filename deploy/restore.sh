#!/bin/sh
# 默默与幸 —— 从备份恢复
#
# ============================================================
# 用法
# ============================================================
#   sh /opt/momo/deploy/restore.sh /opt/momo/backups/diary-20260923-163000.db
#
# 恢复前会把现有 data/ 整体挪到 data.before-restore-<时间戳>/ 留底，
# 确认没问题后可以自己删掉。
#
# ============================================================
# 为什么必须停容器
# ============================================================
# 备份出来的是单个 .db 文件（已包含 WAL 里的全部数据），但目标目录里
# 可能还留着旧库的 -wal / -shm。带着不匹配的 WAL 启动，SQLite 会
# 认为库不完整 —— 轻则报错，重则按 WAL 里的旧数据覆盖回来。
# 所以：停服 -> 清掉 -wal/-shm -> 换库 -> 起服。
#
# ============================================================

set -eu

APP_DIR="${APP_DIR:-/opt/momo}"
CONTAINER="${CONTAINER:-momo}"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

SRC="${1:-}"
if [ -z "$SRC" ]; then
  echo "用法：sh $0 <备份文件.db>"
  echo
  echo "可用备份："
  ls -1t "$APP_DIR"/backups/diary-*.db 2>/dev/null | head -10 || echo "  （没有找到备份）"
  exit 1
fi

if [ ! -f "$SRC" ]; then
  echo "错误：找不到 $SRC"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
KEEP_DIR="$APP_DIR/data.before-restore-$STAMP"

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*"; }

echo "============================================"
echo " 即将用备份覆盖现有数据库"
echo "   备份文件：$SRC"
echo "   目标目录：$APP_DIR/data/"
echo "   现有数据会挪到：$KEEP_DIR"
echo "============================================"
printf '确认继续？输入 yes 回车：'
read -r ans
[ "$ans" = "yes" ] || { echo "已取消。"; exit 0; }

# ---------------------------------------------------------------- 停服
log "停止容器"
docker compose -f "$COMPOSE_FILE" stop "$CONTAINER"

# ---------------------------------------------------------------- 留底
log "现有数据留底 -> $KEEP_DIR"
mkdir -p "$KEEP_DIR"
cp -a "$APP_DIR/data/." "$KEEP_DIR/" 2>/dev/null || true

# ---------------------------------------------------------------- 换库
# 关键：-wal / -shm 必须清掉，否则会带着旧数据回来
log "清理旧库与 WAL 残留"
rm -f "$APP_DIR/data/diary.db" \
      "$APP_DIR/data/diary.db-wal" \
      "$APP_DIR/data/diary.db-shm"

log "写入备份"
cp "$SRC" "$APP_DIR/data/diary.db"

# 容器以 uid 1001 运行，属主不对会写不进去（这个坑踩过一次）
chown 1001:1001 "$APP_DIR/data/diary.db" "$APP_DIR/data"

# ---------------------------------------------------------------- 起服
log "启动容器"
docker compose -f "$COMPOSE_FILE" start "$CONTAINER"

sleep 5
log "容器状态：$(docker ps --filter "name=$CONTAINER" --format '{{.Status}}')"
log "本地自测：$(curl -s -o /dev/null -w 'HTTP %{http_code}' http://127.0.0.1:5200/login)"

echo
echo "恢复完成。留底目录（确认无误后可删）：$KEEP_DIR"
