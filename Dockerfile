# 默默与幸 —— 生产镜像
#
# 三阶段构建：deps（编译原生模块）-> builder（next build）-> runner（只留产物）
#
# 关键点：better-sqlite3 是原生模块，npm ci 时需要 python3 / make / g++。
# 编译工具只留在 deps 阶段，不会进最终镜像。

# ---------------------------------------------------------------- 依赖
FROM node:22-bookworm-slim AS deps

# better-sqlite3 要现编原生模块，装完即删 apt 缓存，避免镜像里留垃圾
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 只拷清单文件，让依赖层能被 Docker 缓存住
COPY package.json package-lock.json ./

RUN npm ci

# ---------------------------------------------------------------- 构建
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------------------------------------------------------------- 运行
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DIARY_DB_PATH=/app/data/diary.db

# 不用 root 跑应用
RUN groupadd -r -g 1001 momo \
 && useradd -r -u 1001 -g momo -s /usr/sbin/nologin momo

# standalone 自带裁剪过的 node_modules，镜像里不需要 npm install
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 数据目录（SQLite 库 + 会话密钥），必须挂卷，否则重建容器就丢数据
RUN mkdir -p /app/data && chown -R momo:momo /app/data
VOLUME ["/app/data"]

USER momo

EXPOSE 3000

# 健康检查：/login 是公开页面，不需要登录态
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
