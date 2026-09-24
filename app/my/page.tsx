import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { MyDiaryCard } from "@/components/MyDiaryCard";
import { EmptyState } from "@/components/ui";
import { formatFullTime, formatTime } from "@/lib/format";
import { requireUserOrRedirect } from "@/lib/guard";
import { getStats, listTimeline } from "@/lib/repo/diary";

export const metadata = { title: "我的说说" };

/**
 * 一次列出的条数。listTimeline 内部把 limit 卡在 50，这里就用满 ——
 * 超出的部分页面底部会提示去哪儿翻。
 */
const PAGE_SIZE = 50;

export default async function MyDiariesPage() {
  const user = await requireUserOrRedirect();

  /**
   * 复用时间轴的查询：viewerId 与 authorId 都传自己，
   * 于是 visibilityClause 里 `d.user_id = @me` 这一支恒成立 ——
   * 「仅自己」和「仅好友」的说说也全都列得出来，不用另写 SQL。
   */
  const items = listTimeline({
    viewerId: user.id,
    authorId: user.id,
    limit: PAGE_SIZE,
  });
  const stats = getStats(user.id);

  return (
    <AppShell user={user}>
      <div className="space-y-5">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <p className="text-xs text-ink-soft">
            共 {stats.total} 条 · 点「编辑」就能改内容和可见范围
          </p>
          <Link
            href="/new"
            className="shrink-0 text-xs text-brand-deep underline underline-offset-2"
          >
            写一条
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-card/50">
            <EmptyState
              title="还没写过什么"
              description="写下来的碎碎念都会出现在这里，随时能改"
              action={
                <Link
                  href="/new"
                  className="text-sm text-brand-deep underline underline-offset-2"
                >
                  去写一条
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((d) => (
              <MyDiaryCard
                key={d.id}
                diary={d}
                timeLabel={formatTime(d.created_at)}
                fullTimeLabel={formatFullTime(d.created_at)}
              />
            ))}
          </div>
        )}

        {stats.total > items.length && (
          <p className="px-1 text-xs text-ink-soft">
            这里只列了最近 {items.length} 条，更早的去
            <Link
              href="/"
              className="mx-1 text-brand-deep underline underline-offset-2"
            >
              碎碎念
            </Link>
            里翻。
          </p>
        )}
      </div>
    </AppShell>
  );
}
