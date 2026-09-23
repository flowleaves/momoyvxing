import type { ReactNode } from "react";

import type { UserRow } from "@/lib/types";

import { BottomTabs, TopBar } from "./NavBar";

/** 登录后的页面外壳：顶栏 + 内容区 + 移动端底部 tab */
export function AppShell({
  user,
  children,
}: {
  user: UserRow;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <TopBar user={user} />
      <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 md:pb-12">
        {children}
      </main>
      <BottomTabs />
    </div>
  );
}
