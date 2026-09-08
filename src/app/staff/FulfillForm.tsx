"use client";

import { useState } from "react";

export function FulfillForm() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/redemptions/${code.trim()}/fulfill`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMessage({ text: data.error, ok: false });
    setMessage({ text: `Fulfilled: ${data.reward}`, ok: true });
    setCode("");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
      <label className="flex flex-col gap-1 text-sm">
        Redemption code
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="A1B2C3D4"
          className="rounded border border-stone-300 px-3 py-2 font-mono uppercase tracking-widest outline-none focus:border-rose-600"
        />
      </label>
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>
      )}
      <button disabled={busy} className="rounded bg-rose-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        Mark fulfilled
      </button>
    </form>
  );
}
