"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MAX_NICKNAME_LENGTH } from "@/lib/config";

import { Alert, Button, Input } from "./ui";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    nickname: "",
    password: "",
    inviteCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "注册失败");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("网络好像出了点问题");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}

      <Input
        label="邀请码"
        name="inviteCode"
        required
        value={form.inviteCode}
        onChange={(e) => set("inviteCode", e.target.value)}
        placeholder="没有邀请码就进不来哦"
      />

      <Input
        label="邮箱"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={form.email}
        onChange={(e) => set("email", e.target.value)}
        placeholder="you@example.com"
      />

      <Input
        label="昵称"
        name="nickname"
        required
        maxLength={MAX_NICKNAME_LENGTH}
        value={form.nickname}
        onChange={(e) => set("nickname", e.target.value)}
        placeholder="想让别人怎么称呼你"
      />

      <Input
        label="密码"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={6}
        value={form.password}
        onChange={(e) => set("password", e.target.value)}
        placeholder="至少 6 位"
      />

      <Button type="submit" size="lg" loading={loading} className="w-full">
        开始记录
      </Button>
    </form>
  );
}
