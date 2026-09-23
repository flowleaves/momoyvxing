/**
 * Route Handler 通用辅助
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

export function isSecureRequest(req: NextRequest): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return req.nextUrl.protocol === "https:";
}

export function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

export function jsonOk<T extends object>(data?: T, status = 200) {
  return NextResponse.json({ ok: true, ...(data ?? {}) }, { status });
}

/** 解析 JSON body，失败返回 null（调用方回 400） */
export async function readJson<T>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
