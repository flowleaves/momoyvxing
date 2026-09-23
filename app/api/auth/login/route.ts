/**
 * POST /api/auth/login —— 登录
 *
 * 失败限流：同 IP 连续 10 次失败锁 5 分钟（沿用 fine-apihub 的策略）。
 * 注意无论「邮箱不存在」还是「密码错误」都返回同一句话，避免枚举邮箱。
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  audit,
  cookieOptions,
  isLocked,
  issueSession,
  recordFailure,
  recordSuccess,
  verifyPassword,
} from "@/lib/auth";
import { COOKIE_NAME, LOGIN_LOCK_MS } from "@/lib/config";
import { getClientIp, isSecureRequest, jsonError, readJson } from "@/lib/http";
import { findUserByEmail, touchLastLogin } from "@/lib/repo/user";

interface Body {
  email?: string;
  password?: string;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (isLocked(ip)) {
    return jsonError(
      `试太多次啦，休息 ${Math.ceil(LOGIN_LOCK_MS / 60000)} 分钟再来吧`,
      429,
      "LOCKED",
    );
  }

  const body = await readJson<Body>(req);
  if (!body) return jsonError("请求格式不正确");

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) return jsonError("邮箱和密码都要填哦");

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    recordFailure(ip);
    audit({
      action: "user.login_failed",
      targetType: "user",
      detail: `email=${email}`,
      ip,
    });
    return jsonError("邮箱或密码不对", 401);
  }

  if (user.status !== "active") {
    return jsonError("这个账号已被停用", 403, "DISABLED");
  }

  recordSuccess(ip);
  touchLastLogin(user.id);
  audit({
    actorId: user.id,
    action: "user.login",
    targetType: "user",
    targetId: user.id,
    ip,
  });

  const token = issueSession(user.id, ip, req.headers.get("user-agent"));
  const res = NextResponse.json({ ok: true, userId: user.id });
  res.cookies.set(COOKIE_NAME, token, cookieOptions(isSecureRequest(req)));
  return res;
}
