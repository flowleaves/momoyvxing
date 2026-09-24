import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * 产出 `.next/standalone` —— 一个自带最小化 node_modules 的可直接运行目录。
   * 镜像里因此不需要 `npm install`，runner 阶段只拷产物即可。
   */
  output: "standalone",

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
   * Next 16 默认只认 `localhost` 这个主机名，其它来源一律拦掉 dev 资源
   * （HMR websocket 握手失败，控制台刷满 ERR_INVALID_HTTP_RESPONSE）。
   *
   * ⚠️ 注意 `127.0.0.1` 也算「非 localhost」。踩过一次：用 127.0.0.1 打开页面
   *    看起来完全正常，但 React 从未 hydration —— 点按钮毫无反应、也没有任何
   *    报错，排查起来很费劲。所以这里显式放行回环地址，两种写法都能用。
   *
   * 用手机连局域网调试时，把电脑的局域网 IP 也加进来
   * （当前这台是 192.168.31.168，`ipconfig` 可查）。
   */
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.31.168"],
};

export default nextConfig;
