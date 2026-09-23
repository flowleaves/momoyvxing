/**
 * /api/drafts
 *   GET —— 取当前草稿
 *   PUT —— 保存草稿（前端 5 秒防抖后调用）
 *   DELETE —— 丢弃草稿
 */

import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { MAX_DIARY_LENGTH, findMood, isValidMood, isValidVisibility } from "@/lib/config";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { clearDraft, getDraft, saveDraft } from "@/lib/repo/draft";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);
  return jsonOk({ draft: getDraft(user.id) ?? null });
}

interface PutBody {
  contentMd?: string;
  mood?: string | null;
  visibility?: number;
  diaryId?: number | null;
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);

  const body = await readJson<PutBody>(req);
  if (!body) return jsonError("请求格式不正确");

  const contentMd = (body.contentMd ?? "").slice(0, MAX_DIARY_LENGTH);
  const mood = isValidMood(body.mood) ? body.mood : null;

  const draft = saveDraft(user.id, {
    contentMd,
    mood,
    moodColor: findMood(mood)?.color ?? null,
    visibility: isValidVisibility(body.visibility) ? body.visibility : 0,
    diaryId: typeof body.diaryId === "number" ? body.diaryId : null,
  });

  return jsonOk({ draft });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);
  clearDraft(user.id);
  return jsonOk();
}
