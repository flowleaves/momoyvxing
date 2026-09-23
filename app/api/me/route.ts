/**
 * /api/me
 *   GET   —— 当前用户资料
 *   PATCH —— 改昵称 / 头像 / 主题皮肤
 */

import type { NextRequest } from "next/server";

import { audit, getCurrentUser } from "@/lib/auth";
import { MAX_NICKNAME_LENGTH, isValidAvatar, isValidTheme } from "@/lib/config";
import { getClientIp, jsonError, jsonOk, readJson } from "@/lib/http";
import { findUserByNickname, findUserById, updateProfile, updateTheme } from "@/lib/repo/user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);

  const { password_hash: _h, password_salt: _s, ...safe } = user;
  return jsonOk({ user: safe });
}

interface PatchBody {
  nickname?: string;
  avatar?: string;
  theme?: string;
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);

  const body = await readJson<PatchBody>(req);
  if (!body) return jsonError("请求格式不正确");

  // ---- 昵称 ----
  if (body.nickname !== undefined) {
    const nickname = body.nickname.trim();
    if (!nickname) return jsonError("昵称不能为空");
    if (nickname.length > MAX_NICKNAME_LENGTH) {
      return jsonError(`昵称最多 ${MAX_NICKNAME_LENGTH} 个字`);
    }
    if (nickname !== user.nickname) {
      const taken = findUserByNickname(nickname);
      if (taken && taken.id !== user.id) {
        return jsonError("这个昵称被占用啦", 409);
      }
      updateProfile(user.id, { nickname });
      audit({
        actorId: user.id,
        action: "user.update_nickname",
        targetType: "user",
        targetId: user.id,
        detail: `${user.nickname} -> ${nickname}`,
        ip: getClientIp(req),
      });
    }
  }

  // ---- 头像（仅预设；上传头像后续再做）----
  if (body.avatar !== undefined) {
    if (!isValidAvatar(body.avatar)) return jsonError("头像参数不对");
    updateProfile(user.id, { avatar: body.avatar, avatarKind: "preset" });
  }

  // ---- 主题皮肤 ----
  if (body.theme !== undefined) {
    if (!isValidTheme(body.theme)) return jsonError("皮肤参数不对");
    updateTheme(user.id, body.theme);
  }

  const fresh = findUserById(user.id);
  if (!fresh) return jsonError("用户不存在", 404);

  const { password_hash: _h, password_salt: _s, ...safe } = fresh;
  return jsonOk({ user: safe });
}
