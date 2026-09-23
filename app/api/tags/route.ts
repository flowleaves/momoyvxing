/**
 * /api/tags —— 当前用户的标签列表（带使用次数）
 */

import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { listTagsWithCount } from "@/lib/repo/diary";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录", 401);
  return jsonOk({ tags: listTagsWithCount(user.id) });
}
