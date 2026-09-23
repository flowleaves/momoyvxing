/**
 * /api/users/search?q=xxx —— 找人（用于关注）
 */

import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { isFollowing } from "@/lib/repo/friend";
import { searchUsers } from "@/lib/repo/user";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return jsonOk({ users: [] });

  const rows = searchUsers(q, user.id, 20);
  const users = rows.map((u) => ({
    ...u,
    following: isFollowing(user.id, u.id),
  }));

  return jsonOk({ users });
}
