import { AppShell } from "@/components/AppShell";
import { QuickNote } from "@/components/QuickNote";
import { Timeline } from "@/components/Timeline";
import { requireUserOrRedirect } from "@/lib/guard";
import { getStats, listTimeline } from "@/lib/repo/diary";

export default async function HomePage() {
  const user = await requireUserOrRedirect();

  const items = listTimeline({ viewerId: user.id, limit: 20 });
  const stats = getStats(user.id);

  return (
    <AppShell user={user}>
      <div className="space-y-5">
        <QuickNote />

        <p className="px-1 text-xs text-ink-soft">
          已经写了 {stats.total} 篇，这个月 {stats.month} 篇
        </p>

        <Timeline items={items} />
      </div>
    </AppShell>
  );
}
