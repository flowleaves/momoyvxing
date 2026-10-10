import { AppShell } from "@/components/AppShell";
import { QuickNote } from "@/components/QuickNote";
import { Timeline } from "@/components/Timeline";
import { requireUserOrRedirect } from "@/lib/guard";
import { getStats, listTimeline } from "@/lib/repo/diary";
import { listRepliesForDiaries } from "@/lib/repo/reply";

export default async function HomePage() {
  const user = await requireUserOrRedirect();

  const items = listTimeline({ viewerId: user.id, limit: 20 });
  const stats = getStats(user.id);
  // 一次查询把这一整页的回复都取回来（避免每张卡片各查一次）
  const repliesByDiary = listRepliesForDiaries(items.map((d) => d.id));

  return (
    <AppShell user={user}>
      <div className="space-y-5">
        <QuickNote />

        <p className="px-1 text-xs text-ink-soft">
          已经写了 {stats.total} 篇，这个月 {stats.month} 篇
        </p>

        <Timeline items={items} viewer={user} repliesByDiary={repliesByDiary} />
      </div>
    </AppShell>
  );
}
