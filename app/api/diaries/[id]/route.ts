/**
 * /api/diaries/[id]
 *   GET    —— 单篇详情（受可见性过滤）
 *   PATCH  —— 修改（仅作者）
 *   DELETE —— 软删（仅作者）
 */

import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  MAX_DIARY_LENGTH,
  MAX_TAGS_PER_DIARY,
  findMood,
  isValidMood,
  isValidVisibility,
} from "@/lib/config";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { getDiaryForViewer, getOwnDiary, softDeleteDiary, updateDiary } from "@/lib/repo/diary";

type Ctx = { params: Promise<{ id: string }> };

async function resolveId(ctx: Ctx): Promise<number | null> {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);

  const id = await resolveId(ctx);
  if (!id) return jsonError("参数不对");

  const diary = getDiaryForViewer(id, user.id);
  if (!diary) return jsonError("找不到这篇日记", 404);

  return jsonOk({ diary });
}

interface PatchBody {
  contentMd?: string;
  mood?: string | null;
  visibility?: number;
  tags?: string[];
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);

  const id = await resolveId(ctx);
  if (!id) return jsonError("参数不对");

  if (!getOwnDiary(id, user.id)) {
    return jsonError("找不到这篇日记", 404);
  }

  const body = await readJson<PatchBody>(req);
  if (!body) return jsonError("请求格式不正确");

  const patch: Parameters<typeof updateDiary>[2] = {};

  if (body.contentMd !== undefined) {
    const contentMd = body.contentMd.trim();
    if (!contentMd) return jsonError("内容不能为空");
    if (contentMd.length > MAX_DIARY_LENGTH) {
      return jsonError(`太长了，最多 ${MAX_DIARY_LENGTH} 字`);
    }
    patch.contentMd = contentMd;
  }

  if (body.mood !== undefined) {
    const mood = isValidMood(body.mood) ? body.mood : null;
    patch.mood = mood;
    patch.moodColor = findMood(mood)?.color ?? null;
  }

  if (body.visibility !== undefined) {
    if (!isValidVisibility(body.visibility)) return jsonError("可见性参数不对");
    patch.visibility = body.visibility;
  }

  if (body.tags !== undefined) {
    patch.tags = body.tags
      .map((t) => String(t).trim())
      .filter(Boolean)
      .slice(0, MAX_TAGS_PER_DIARY);
  }

  const diary = updateDiary(id, user.id, patch);
  return jsonOk({ diary });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);

  const id = await resolveId(ctx);
  if (!id) return jsonError("参数不对");

  const ok = softDeleteDiary(id, user.id);
  if (!ok) return jsonError("找不到这篇日记", 404);

  return jsonOk();
}
