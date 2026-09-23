/**
 * /api/diaries
 *   GET  —— 时间轴（受可见性过滤）
 *   POST —— 新建日记
 */

import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { MAX_DIARY_LENGTH, MAX_TAGS_PER_DIARY, findMood, isValidMood, isValidVisibility } from "@/lib/config";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { createDiary, listTimeline } from "@/lib/repo/diary";
import { clearDraft } from "@/lib/repo/draft";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);

  const sp = req.nextUrl.searchParams;
  const authorRaw = sp.get("author");

  const items = listTimeline({
    viewerId: user.id,
    limit: Number(sp.get("limit") ?? 20),
    before: sp.get("before") ?? undefined,
    tagName: sp.get("tag") ?? undefined,
    mood: sp.get("mood") ?? undefined,
    authorId: authorRaw ? Number(authorRaw) : undefined,
  });

  return jsonOk({ items });
}

interface CreateBody {
  contentMd?: string;
  mood?: string | null;
  visibility?: number;
  tags?: string[];
  /** 存完是否清掉草稿（默认 true） */
  clearDraftAfter?: boolean;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);

  const body = await readJson<CreateBody>(req);
  if (!body) return jsonError("请求格式不正确");

  const contentMd = (body.contentMd ?? "").trim();
  if (!contentMd) return jsonError("写点什么再存吧");
  if (contentMd.length > MAX_DIARY_LENGTH) {
    return jsonError(`太长了，最多 ${MAX_DIARY_LENGTH} 字`);
  }

  const visibility = isValidVisibility(body.visibility) ? body.visibility : 0;
  const mood = isValidMood(body.mood) ? body.mood : null;
  const moodColor = findMood(mood)?.color ?? null;

  const tags = (body.tags ?? [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, MAX_TAGS_PER_DIARY);

  const diary = createDiary({
    userId: user.id,
    contentMd,
    mood,
    moodColor,
    visibility,
    tags,
  });

  if (body.clearDraftAfter !== false) clearDraft(user.id);

  return jsonOk({ diary }, 201);
}
