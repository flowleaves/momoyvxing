"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteDiaryButton({ id }: { id: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/diaries/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-ink-soft transition-colors hover:text-red-600"
      >
        删掉这篇
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-ink-soft">确定删掉？</span>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="text-red-600 hover:underline disabled:opacity-50"
      >
        删
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-ink-soft hover:underline"
      >
        算了
      </button>
    </span>
  );
}
