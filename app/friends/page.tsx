import { AppShell } from "@/components/AppShell";
import { UserList, UserSearch } from "@/components/Friends";
import { requireUserOrRedirect } from "@/lib/guard";
import { listFollowers, listFollowing, listFriends } from "@/lib/repo/friend";

export const metadata = { title: "好友" };

export default async function FriendsPage() {
  const user = await requireUserOrRedirect();

  const friends = listFriends(user.id);
  const following = listFollowing(user.id);
  const followers = listFollowers(user.id);

  return (
    <AppShell user={user}>
      <div className="space-y-7">
        <section>
          <h1 className="mb-3 font-round text-xl text-ink">找人</h1>
          <UserSearch />
        </section>

        <section>
          <h2 className="mb-2.5 text-sm text-ink-soft">
            互相都在 · {friends.length}
          </h2>
          <UserList
            users={friends}
            emptyText="还没有互相都在的人"
          />
        </section>

        <section>
          <h2 className="mb-2.5 text-sm text-ink-soft">
            我关注的 · {following.length}
          </h2>
          <UserList users={following} emptyText="还没有关注谁" />
        </section>

        <section>
          <h2 className="mb-2.5 text-sm text-ink-soft">
            关注我的 · {followers.length}
          </h2>
          <UserList users={followers} emptyText="还没有人关注你" />
        </section>
      </div>
    </AppShell>
  );
}
