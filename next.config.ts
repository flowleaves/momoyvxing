import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * better-sqlite3 是原生模块（.node 二进制），必须交给 Node 运行时直接 require，
   * 不能让 Turbopack 打包——否则构建产物里会出现「找不到 bindings」的运行时报错。
   */
  serverExternalPackages: ["better-sqlite3"],

  /**
   * 不显式指定 root 时，Turbopack 会一路向上找到 C:\Users\fine 下的
   * package-lock.json，把它当项目根（控制台那条 "ignored package-lock.json"
   * 警告就是这么来的），还会连带扫描整个 home 目录。
   */
  turbopack: {
    root: path.resolve(process.cwd()),
  },

  /**
   * Next 16 默认拦截非 localhost 的 dev 资源请求（HMR websocket 会被拒，
   * 控制台刷满报错）。用手机连局域网调试时，把电脑的局域网 IP 填进来。
   * 当前这台机器的局域网地址是 192.168.31.168（`ipconfig` 可查）。
   */
  allowedDevOrigins: ["192.168.31.168"],
};

export default nextConfig;
