import type { Metadata, Viewport } from "next";

import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_THEME, SITE_NAME, SITE_TAGLINE, isValidTheme } from "@/lib/config";

// 站酷快乐体（中文圆体，OFL 协议）。按 unicode-range 分片，按需加载。
import "@fontsource/zcool-kuaile/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_TAGLINE,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4a0b8",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * 在服务端就把主题写进 <html data-theme>，避免首屏闪烁（FOUC）。
   * 若改用 localStorage 存主题，刷新时会先渲染默认皮肤再跳变。
   *
   * DB 出问题时不能让整站白屏，所以整体兜底成默认主题。
   */
  let theme: string = DEFAULT_THEME;
  try {
    const user = await getCurrentUser();
    if (user && isValidTheme(user.theme)) theme = user.theme;
  } catch {
    /* 库还没建好 / 查询失败：用默认皮肤继续渲染 */
  }

  return (
    <html lang="zh-CN" data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
