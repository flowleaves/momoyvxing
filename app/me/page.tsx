import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { ProfileSettings } from "@/components/ProfileSettings";
import { Card } from "@/components/ui";
import { requireUserOrRedirect } from "@/lib/guard";
import { getStats, listTagsWithCount } from "@/lib/repo/diary";
import { countFriends } from "@/lib/repo/friend";

export const metadata = { title: "个人设置" };

export default async function MePage() {
  const user = await requireUserOrRedirect();

  const stats = getStats(user.id);
  const tags = listTagsWithCount(user.id);
  const friends = countFriends(user.id);

  return (
    <AppShell user={user}>
      <div className="space-y-5">
        <Card className="p-4">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "写过的日记", value: stats.total },
              { label: "这个月", value: stats.month },
              { label: "好友", value: friends },
            ].map((s) => (
              <div key={s.label}>
                <dd className="font-round text-2xl text-ink">{s.value}</dd>
                <dt className="mt-0.5 text-xs text-ink-soft">{s.label}</dt>
              </div>
            ))}
          </dl>
        </Card>

        <ProfileSettings
          user={{
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            avatar: user.avatar,
            avatar_kind: user.avatar_kind,
            theme: user.theme,
          }}
        />

        <Card className="p-4">
          <h2 className="mb-2.5 font-round text-base text-ink">我的标签</h2>
          {tags.length === 0 ? (
            <p className="text-sm text-ink-soft">还没用过标签</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Link
                  key={t.id}
                  href={`/tags/${encodeURIComponent(t.name)}`}
                  className="rounded-full bg-brand-soft px-2.5 py-1 text-xs text-ink transition-colors hover:brightness-95"
                >
                  #{t.name}
                  <span className="ml-1 text-ink-soft">{t.count}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
