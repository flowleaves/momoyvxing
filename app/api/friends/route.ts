/**
 * /api/friends
 *   GET  —— 我的好友 / 关注 / 粉丝
 *   POST —— 关注或取关
 */

import type { NextRequest } from "next/server";

import { audit, getCurrentUser } from "@/lib/auth";
import { getClientIp, jsonError, jsonOk, readJson } from "@/lib/http";
import { follow, listFollowers, listFollowing, listFriends, unfollow } from "@/lib/repo/friend";
import { findUserById } from "@/lib/repo/user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);

  return jsonOk({
    friends: listFriends(user.id),
    following: listFollowing(user.id),
    followers: listFollowers(user.id),
  });
}

interface PostBody {
  action?: "follow" | "unfollow";
  userId?: number;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);

  const body = await readJson<PostBody>(req);
  if (!body) return jsonError("请求格式不正确");

  const targetId = Number(body.userId);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return jsonError("参数不对");
  }
  if (targetId === user.id) {
    return jsonError("不能关注自己呀");
  }

  const target = findUserById(targetId);
  if (!target || target.status !== "active") {
    return jsonError("找不到这个人", 404);
  }

  if (body.action === "unfollow") {
    unfollow(user.id, targetId);
  } else {
    follow(user.id, targetId);
  }

  audit({
    actorId: user.id,
    action: body.action === "unfollow" ? "user.unfollow" : "user.follow",
    targetType: "user",
    targetId,
    ip: getClientIp(req),
  });

  return jsonOk({ following: body.action !== "unfollow" });
}
