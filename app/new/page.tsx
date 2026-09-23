import { AppShell } from "@/components/AppShell";
import { DiaryEditor } from "@/components/DiaryEditor";
import { requireUserOrRedirect } from "@/lib/guard";
import { listTagsWithCount } from "@/lib/repo/diary";
import { getDraft } from "@/lib/repo/draft";

export const metadata = { title: "写日记" };

export default async function NewDiaryPage() {
  const user = await requireUserOrRedirect();

  const draft = getDraft(user.id) ?? null;
  const suggestions = listTagsWithCount(user.id).map((t) => t.name);

  return (
    <AppShell user={user}>
      <DiaryEditor initialDraft={draft} suggestions={suggestions} />
    </AppShell>
  );
}
