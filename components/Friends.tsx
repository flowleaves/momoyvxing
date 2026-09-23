"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "./Avatar";
import { Button, EmptyState, Input, cn } from "./ui";

interface SearchUser {
  id: number;
  nickname: string;
  avatar: string;
  avatar_kind: string;
  following: boolean;
}

export function FollowButton({
  userId,
  initialFollowing,
  size = "sm",
}: {
  userId: number;
  initialFollowing: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: following ? "unfollow" : "follow",
          userId,
        }),
      });
      if (res.ok) {
        setFollowing(!following);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size={size}
      variant={following ? "soft" : "primary"}
      onClick={toggle}
      loading={busy}
    >
      {following ? "已关注" : "关注"}
    </Button>
  );
}

export function UserSearch() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);

  /**
   * 搜索防抖。
   *
   * 清空结果放在 onChange 里做，不在这里 setState ——
   * effect 内同步 setState 会触发级联渲染（react-hooks/set-state-in-effect）。
   */
  useEffect(() => {
    const keyword = q.trim();
    if (!keyword) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(keyword)}`,
        );
        const data = (await res.json()) as { users?: SearchUser[] };
        setUsers(data.users ?? []);
      } catch {
        setUsers([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="space-y-3">
      <Input
        value={q}
        onChange={(e) => {
          const v = e.target.value;
          setQ(v);
          // 清空输入时立刻收起结果，不必等 effect 跑
          if (!v.trim()) {
            setUsers([]);
            setSearching(false);
          }
        }}
        placeholder="输入昵称或邮箱找人"
      />

      {searching && <p className="px-1 text-xs text-ink-soft">找找看…</p>}

      {!searching && q.trim() && users.length === 0 && (
        <p className="px-1 text-xs text-ink-soft">没找到这个人</p>
      )}

      {users.length > 0 && (
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className={cn(
                "flex items-center gap-3 rounded-md border border-line bg-card px-3 py-2",
              )}
            >
              <Avatar user={u} size={30} />
              <span className="text-sm text-ink">{u.nickname}</span>
              <span className="ml-auto">
                <FollowButton userId={u.id} initialFollowing={u.following} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function UserList({
  users,
  emptyText,
}: {
  users: Array<{
    id: number;
    nickname: string;
    avatar: string;
    avatar_kind: string;
    follows_back?: number;
    i_follow?: number;
  }>;
  emptyText: string;
}) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-card/50">
        <EmptyState title={emptyText} />
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {users.map((u) => {
        // 单向关注列表里标出「对方也关注了我」，方便一眼看出谁是好友
        const mutual = (u.follows_back ?? 0) === 1;
        return (
          <li
            key={u.id}
            className="flex items-center gap-3 rounded-md border border-line bg-card px-3 py-2"
          >
            <Avatar user={u} size={30} />
            <span className="text-sm text-ink">{u.nickname}</span>
            {mutual && (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-ink-soft">
                互相都在
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
