"use client";

import { useState } from "react";

type Tier = {
  id: string;
  name: string;
  minLifetimeSpend: number;
  pointsPer100: number;
  memberCount: number;
};

export function TiersClient({ initialTiers }: { initialTiers: Tier[] }) {
  const [tiers, setTiers] = useState(initialTiers);
  const [name, setName] = useState("");
  const [minLifetimeSpend, setMinLifetimeSpend] = useState("0");
  const [pointsPer100, setPointsPer100] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createTier(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/staff/tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        minLifetimeSpend: Number(minLifetimeSpend) || 0,
        pointsPer100: Number(pointsPer100) || 0,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setTiers((t) =>
      [...t, { ...data.tier, memberCount: 0 }].sort((a, b) => a.minLifetimeSpend - b.minLifetimeSpend)
    );
    setName("");
    setMinLifetimeSpend("0");
    setPointsPer100("10");
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-2">
        {tiers.map((tier) => (
          <li key={tier.id} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4 text-sm">
            <div>
              <p className="font-medium">{tier.name}</p>
              <p className="text-xs text-stone-500">
                From ₹{tier.minLifetimeSpend.toLocaleString("en-IN")} lifetime spend · {tier.memberCount} member
                {tier.memberCount === 1 ? "" : "s"}
              </p>
            </div>
            <p className="font-mono tabular-nums text-rose-700">{tier.pointsPer100} pts / ₹100</p>
          </li>
        ))}
        {tiers.length === 0 && <p className="text-sm text-stone-500">No tiers yet.</p>}
      </ul>

      <form onSubmit={createTier} className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
        <p className="text-sm font-medium text-stone-700">Add a tier</p>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Gold"
          className="rounded border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-600"
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-stone-500">
            Starts at (₹ lifetime spend)
            <input
              required
              type="number"
              min="0"
              value={minLifetimeSpend}
              onChange={(e) => setMinLifetimeSpend(e.target.value)}
              className="rounded border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-600"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-stone-500">
            Points per ₹100 spent
            <input
              required
              type="number"
              min="1"
              value={pointsPer100}
              onChange={(e) => setPointsPer100(e.target.value)}
              className="rounded border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-600"
            />
          </label>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="self-start rounded bg-rose-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          Add tier
        </button>
      </form>
    </div>
  );
}
