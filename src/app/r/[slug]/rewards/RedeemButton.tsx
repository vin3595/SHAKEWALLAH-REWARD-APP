"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LiveRedemptionQR } from "./LiveRedemptionQR";

export function RedeemButton({ rewardId, disabled }: { rewardId: string; disabled: boolean }) {
  const router = useRouter();
  const [redemption, setRedemption] = useState<{ id: string; code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function redeem() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/redemptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setRedemption({ id: data.redemptionId, code: data.code });
    router.refresh();
  }

  if (redemption) {
    return <LiveRedemptionQR redemptionId={redemption.id} initialCode={redemption.code} />;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={redeem}
        disabled={disabled || busy}
        className="whitespace-nowrap rounded bg-rose-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        Redeem
      </button>
      {error && <p className="max-w-[9rem] text-right text-xs text-red-700">{error}</p>}
    </div>
  );
}
