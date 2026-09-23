import { AppShell } from "@/components/AppShell";
import { Timeline } from "@/components/Timeline";
import { requireUserOrRedirect } from "@/lib/guard";
import { listTimeline } from "@/lib/repo/diary";

export default async function TagPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const user = await requireUserOrRedirect();
  const { name } = await params;
  const tagName = decodeURIComponent(name);

  const items = listTimeline({ viewerId: user.id, tagName, limit: 50 });

  return (
    <AppShell user={user}>
      <div className="space-y-5">
        <header className="px-1">
          <h1 className="font-round text-xl text-ink">#{tagName}</h1>
          <p className="mt-1 text-xs text-ink-soft">
            带这个标签的日记，共 {items.length} 篇
          </p>
        </header>

        <Timeline
          items={items}
          emptyTitle={`还没有用过 #${tagName}`}
          emptyDescription="换个标签看看，或者去写一篇"
        />
      </div>
    </AppShell>
  );
}
