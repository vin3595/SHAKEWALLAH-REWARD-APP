"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Claim = {
  id: string;
  billNo: string;
  billDate: Date;
  amountPaise: number;
  photoUrl: string;
  customer: { phone: string; name: string | null };
  outlet: { name: string };
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function ClaimsList({ initialClaims, showOutlet }: { initialClaims: Claim[]; showOutlet: boolean }) {
  const router = useRouter();
  const [claims, setClaims] = useState(initialClaims);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/claims/${id}/approve`, { method: "POST" });
    setBusyId(null);
    if (res.ok) {
      setClaims((c) => c.filter((claim) => claim.id !== id));
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Reason for rejecting this claim?");
    if (!reason) return;
    setBusyId(id);
    const res = await fetch(`/api/claims/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setBusyId(null);
    if (res.ok) {
      setClaims((c) => c.filter((claim) => claim.id !== id));
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  }

  if (claims.length === 0) {
    return <p className="text-sm text-stone-500">Nothing pending.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {claims.map((claim) => (
        <li key={claim.id} className="flex gap-3 rounded-lg border border-stone-200 bg-white p-3">
          <a href={claim.photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={claim.photoUrl} alt="Bill" className="h-20 w-20 rounded object-cover" />
          </a>
          <div className="flex flex-1 flex-col gap-1 text-sm">
            <p className="font-medium">
              {claim.customer.name ?? claim.customer.phone} · ₹{(claim.amountPaise / 100).toFixed(2)}
            </p>
            <p className="text-stone-500">
              Bill #{claim.billNo} · {dateFormatter.format(new Date(claim.billDate))}
              {showOutlet ? ` · ${claim.outlet.name}` : ""}
            </p>
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => approve(claim.id)}
                disabled={busyId === claim.id}
                className="rounded bg-emerald-700 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => reject(claim.id)}
                disabled={busyId === claim.id}
                className="rounded border border-red-700 px-3 py-1 text-xs font-medium text-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
