"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MAX_NICKNAME_LENGTH, PRESET_AVATARS, THEMES } from "@/lib/config";

import { Avatar } from "./Avatar";
import { Alert, Button, Card, Input, cn } from "./ui";

export interface ProfileUser {
  id: number;
  email: string;
  nickname: string;
  avatar: string;
  avatar_kind: string;
  theme: string;
}

export function ProfileSettings({ user }: { user: ProfileUser }) {
  const router = useRouter();

  const [nickname, setNickname] = useState(user.nickname);
  const [avatar, setAvatar] = useState(user.avatar);
  const [theme, setTheme] = useState(user.theme);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "info" | "error"; text: string } | null>(
    null,
  );

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setMsg({ tone: "error", text: data.error || "没保存上" });
      return false;
    }
    router.refresh();
    return true;
  }

  async function saveNickname() {
    const next = nickname.trim();
    if (!next || next === user.nickname) return;
    setBusy(true);
    setMsg(null);
    const ok = await patch({ nickname: next });
    if (ok) setMsg({ tone: "info", text: "昵称改好啦" });
    setBusy(false);
  }

  async function pickAvatar(key: string) {
    setAvatar(key);
    setMsg(null);
    const ok = await patch({ avatar: key });
    if (ok) setMsg({ tone: "info", text: "头像换好啦" });
  }

  async function pickTheme(key: string) {
    setTheme(key);
    // 先改 DOM，视觉立刻生效，不用等网络往返
    document.documentElement.dataset.theme = key;
    setMsg(null);
    await patch({ theme: key });
  }

  return (
    <div className="space-y-4">
      {msg && <Alert tone={msg.tone === "error" ? "error" : "info"}>{msg.text}</Alert>}

      {/* 昵称 */}
      <Card className="space-y-3 p-4">
        <h2 className="font-round text-base text-ink">昵称</h2>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={MAX_NICKNAME_LENGTH}
              placeholder="想叫什么"
            />
          </div>
          <Button
            onClick={saveNickname}
            loading={busy}
            disabled={!nickname.trim() || nickname.trim() === user.nickname}
          >
            改
          </Button>
        </div>
        <p className="text-xs text-ink-soft">登录邮箱：{user.email}</p>
      </Card>

      {/* 头像 */}
      <Card className="space-y-3 p-4">
        <h2 className="font-round text-base text-ink">头像</h2>
        <div className="flex flex-wrap gap-2">
          {PRESET_AVATARS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => pickAvatar(key)}
              aria-label={`选择头像 ${key}`}
              aria-pressed={avatar === key}
              className={cn(
                "rounded-full p-0.5 transition-all duration-150",
                avatar === key
                  ? "ring-2 ring-brand ring-offset-2 ring-offset-card"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              <Avatar
                user={{ nickname: user.nickname, avatar: key, avatar_kind: "preset" }}
                size={44}
              />
            </button>
          ))}
        </div>
      </Card>

      {/* 皮肤 */}
      <Card className="space-y-3 p-4">
        <h2 className="font-round text-base text-ink">皮肤</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => pickTheme(t.key)}
              aria-pressed={theme === t.key}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors duration-150",
                theme === t.key
                  ? "border-brand bg-brand-soft text-ink"
                  : "border-line text-ink-soft hover:bg-brand-soft/40",
              )}
            >
              <span
                className="inline-block size-4 shrink-0 rounded-full border border-line"
                style={{ background: t.preview }}
                aria-hidden
              />
              {t.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
