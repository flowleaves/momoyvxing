/**
 * POST /api/auth/logout —— 登出
 *
 * 服务端删会话记录（不是只清 Cookie），所以旧 token 立刻失效。
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { cookieOptions, revokeSession } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/config";
import { isSecureRequest } from "@/lib/http";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) revokeSession(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", {
    ...cookieOptions(isSecureRequest(req)),
    maxAge: 0,
  });
  return res;
}
