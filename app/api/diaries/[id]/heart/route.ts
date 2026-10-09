/**
 * /api/diaries/[id]/heart
 *   POST —— 切换爱心（点一下 = 已读，再点一下取消）
 *
 * 权限（能否看见这篇说说）由 repo 层的 visibilityClause 负责，
 * 这里只做「登录 + 参数合法」的浅校验，不在路由里重复一遍可见性逻辑。
 */

import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { toggleHeart } from "@/lib/repo/diary";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);

  const { id } = await ctx.params;
  const diaryId = Number(id);
  if (!Number.isInteger(diaryId) || diaryId <= 0) return jsonError("参数不对");

  const result = toggleHeart(diaryId, user.id);
  // null：日记不存在、无权查看，或试图给自己的说说点爱心
  if (!result) return jsonError("不能给这篇点爱心", 403);

  return jsonOk(result);
}
