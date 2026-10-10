import { notFound } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { DeleteDiaryButton } from "@/components/DeleteDiaryButton";
import { DiaryCard } from "@/components/Timeline";
import { requireUserOrRedirect } from "@/lib/guard";
import { getDiaryForViewer } from "@/lib/repo/diary";
import { listReplies } from "@/lib/repo/reply";

export default async function DiaryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserOrRedirect();
  const { id } = await params;

  const diaryId = Number(id);
  if (!Number.isInteger(diaryId) || diaryId <= 0) notFound();

  // 无权查看时返回 null —— 与「不存在」统一处理，不泄露日记是否存在
  const diary = getDiaryForViewer(diaryId, user.id);
  if (!diary) notFound();

  // 详情页把回复一次拉全（回复量很小，不需要分页）
  const replies = listReplies(diaryId, user.id);

  return (
    <AppShell user={user}>
      <div className="space-y-4">
        <DiaryCard
          diary={diary}
          linkable={false}
          viewer={user}
          replies={replies}
        />

        {diary.user_id === user.id && (
          <div className="flex justify-end px-1">
            <DeleteDiaryButton id={diary.id} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
