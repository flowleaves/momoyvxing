/**
 * /api/diaries/[id]/replies
 *   GET  —— 列出该日记的回复（按时间正序）
 *   POST —— 新增一条回复
 *
 * 权限：完全跟着日记的可见性走。「看不见日记」与「日记不存在」统一回 404，
 * 不通过响应差异泄露日记是否存在（与详情页同一策略）。
 */

import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { MAX_REPLY_LENGTH } from "@/lib/config";
import { countChars } from "@/lib/format";
import { jsonError, jsonOk, readJson } from "@/lib/http";
import { getVisibleDiaryAuthor } from "@/lib/repo/diary";
import { createReply, listReplies } from "@/lib/repo/reply";

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

  // 先判可见性：看不见 / 不存在都回 404，不区分（不泄露存在性）。
  // 放在 listReplies 之前，「没回复」与「看不见」就不会混为一谈。
  if (!getVisibleDiaryAuthor(id, user.id)) {
    return jsonError("找不到这篇日记", 404);
  }

  return jsonOk({ replies: listReplies(id, user.id) });
}

interface CreateBody {
  contentMd?: string;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);

  const id = await resolveId(ctx);
  if (!id) return jsonError("参数不对");

  const body = await readJson<CreateBody>(req);
  if (!body) return jsonError("请求格式不正确");

  const contentMd = (body.contentMd ?? "").trim();
  if (!contentMd) return jsonError("回复不能是空的");
  // 与日记正文同口径：按 Unicode 码点计，emoji 算 1 个字
  if (countChars(contentMd) > MAX_REPLY_LENGTH) {
    return jsonError(`回复太长了，最多 ${MAX_REPLY_LENGTH} 字`);
  }

  const reply = createReply({ diaryId: id, userId: user.id, contentMd });
  // null：日记不存在或无权查看
  if (!reply) return jsonError("找不到这篇日记", 404);

  return jsonOk({ reply }, 201);
}
