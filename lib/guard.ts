/**
 * 页面守卫
 *
 * ⚠️ 为什么不放 middleware.ts：Next 16 的 middleware 跑在 Edge runtime，
 *    没有 node:crypto / better-sqlite3，无法校验会话是否在库里（已登出）。
 *    所以守卫放在 Server Component 里，每个受保护页面调用。
 */

import { redirect } from "next/navigation";

import { getCurrentUser } from "./auth";
import type { UserRow } from "./types";

/** 取当前用户，未登录直接跳登录页 */
export async function requireUserOrRedirect(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
