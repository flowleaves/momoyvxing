import { notFound } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { DeleteDiaryButton } from "@/components/DeleteDiaryButton";
import { DiaryCard } from "@/components/Timeline";
import { requireUserOrRedirect } from "@/lib/guard";
import { getDiaryForViewer } from "@/lib/repo/diary";

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

  return (
    <AppShell user={user}>
      <div className="space-y-4">
        <DiaryCard diary={diary} linkable={false} />

        {diary.user_id === user.id && (
          <div className="flex justify-end px-1">
            <DeleteDiaryButton id={diary.id} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
