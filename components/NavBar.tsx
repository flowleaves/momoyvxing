"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { SITE_NAME } from "@/lib/config";

import { Avatar, type AvatarUser } from "./Avatar";
import { Sprout } from "./decor";
import { cn } from "./ui";

const NAV = [
  { href: "/", label: "碎碎念" },
  { href: "/new", label: "写日记" },
  { href: "/friends", label: "好友" },
  { href: "/me", label: "我的" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function TopBar({ user }: { user: AvatarUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-card/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 font-round text-base text-ink"
        >
          <Sprout className="w-5 text-brand" />
          <span className="hidden sm:inline">{SITE_NAME}</span>
        </Link>

        {/* 桌面端导航 */}
        <nav className="ml-2 hidden items-center gap-0.5 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors duration-150",
                isActive(pathname, item.href)
                  ? "bg-brand-soft text-ink"
                  : "text-ink-soft hover:bg-brand-soft/50",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Avatar user={{ ...user, nickname: user.nickname }} size={30} />
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="rounded-full px-2 py-1 text-xs text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
          >
            退出
          </button>
        </div>
      </div>
    </header>
  );
}

/** 移动端底部 tab —— 写碎碎念的主场景是手机 */
export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors duration-150",
                active ? "text-ink" : "text-ink-soft",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-1 w-6 rounded-full transition-colors duration-150",
                  active ? "bg-brand" : "bg-transparent",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
