/**
 * POST /api/auth/register —— 注册
 *
 * 邀请码校验 → 邮箱查重 → scrypt 哈希 → 建用户（事务）→ 签发会话
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { audit, issueSession, cookieOptions } from "@/lib/auth";
import {
  COOKIE_NAME,
  MAX_NICKNAME_LENGTH,
  PRESET_AVATARS,
  getInviteCodes,
} from "@/lib/config";
import { getClientIp, isSecureRequest, jsonError, readJson } from "@/lib/http";
import { countInviteUsage, createUser, findUserByEmail, findUserByNickname } from "@/lib/repo/user";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

interface Body {
  email?: string;
  password?: string;
  nickname?: string;
  inviteCode?: string;
}

export async function POST(req: NextRequest) {
  const body = await readJson<Body>(req);
  if (!body) return jsonError("请求格式不正确");

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const nickname = (body.nickname ?? "").trim();
  const inviteCode = (body.inviteCode ?? "").trim();

  if (!EMAIL_RE.test(email)) return jsonError("邮箱格式不对呀");
  if (password.length < MIN_PASSWORD) {
    return jsonError(`密码至少要 ${MIN_PASSWORD} 位`);
  }
  if (!nickname) return jsonError("给自己起个昵称吧");
  if (nickname.length > MAX_NICKNAME_LENGTH) {
    return jsonError(`昵称最多 ${MAX_NICKNAME_LENGTH} 个字`);
  }

  // ---- 邀请码校验 ----
  const codes = getInviteCodes();
  if (codes.length === 0) {
    return jsonError("站点还没开放注册", 403, "REGISTER_CLOSED");
  }
  const matched = codes.find((c) => c.code === inviteCode);
  if (!matched) return jsonError("邀请码不对哦", 403, "BAD_INVITE");
  if (matched.maxUses > 0 && countInviteUsage(matched.code) >= matched.maxUses) {
    return jsonError("这个邀请码已经用满啦", 403, "INVITE_EXHAUSTED");
  }

  // ---- 查重 ----
  if (findUserByEmail(email)) return jsonError("这个邮箱已经注册过了", 409);
  if (findUserByNickname(nickname)) return jsonError("这个昵称被占用啦", 409);

  // ---- 建用户 ----
  let user;
  try {
    user = createUser({
      email,
      password,
      nickname,
      inviteCode: matched.code,
      avatar: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)],
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      return jsonError("邮箱或昵称已被占用", 409);
    }
    throw err;
  }

  const ip = getClientIp(req);
  audit({
    actorId: user.id,
    action: "user.register",
    targetType: "user",
    targetId: user.id,
    detail: `invite=${matched.code}`,
    ip,
  });

  const token = issueSession(user.id, ip, req.headers.get("user-agent"));
  const res = NextResponse.json({ ok: true, userId: user.id });
  res.cookies.set(COOKIE_NAME, token, cookieOptions(isSecureRequest(req)));
  return res;
}
