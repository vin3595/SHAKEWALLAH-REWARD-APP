"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// YYYY-MM-DDTHH:mm in local time, as <input type="datetime-local"> expects.
function nowForDateTimeLocal() {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function ClaimForm({ outletToken }: { outletToken: string }) {
  const router = useRouter();
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState(nowForDateTimeLocal);
  const [amountRupees, setAmountRupees] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) return setError("Attach a photo of the bill.");
    setError(null);
    setBusy(true);

    const form = new FormData();
    form.set("outletToken", outletToken);
    form.set("billNo", billNo);
    form.set("billDate", new Date(billDate).toISOString());
    form.set("amountRupees", amountRupees);
    form.set("photo", photo);

    const res = await fetch("/api/claims", { method: "POST", body: form });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-stone-200 bg-white p-6 text-center">
        <p className="text-lg font-medium">Claim submitted</p>
        <p className="text-sm text-stone-600">
          Outlet staff will review it shortly. You&apos;ll see the points on your balance once approved.
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded bg-rose-700 px-4 py-2 font-medium text-white"
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Bill number
        <input
          required
          value={billNo}
          onChange={(e) => setBillNo(e.target.value)}
          placeholder="As printed on the receipt"
          className="rounded border border-stone-300 px-3 py-2 outline-none focus:border-rose-600"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Date &amp; time on the bill
        <input
          required
          type="datetime-local"
          value={billDate}
          max={nowForDateTimeLocal()}
          onChange={(e) => setBillDate(e.target.value)}
          className="rounded border border-stone-300 px-3 py-2 outline-none focus:border-rose-600"
        />
        <span className="text-xs text-stone-500">Must be claimed within 24 hours of this time.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Bill amount (₹)
        <input
          required
          type="number"
          min="1"
          step="0.01"
          value={amountRupees}
          onChange={(e) => setAmountRupees(e.target.value)}
          placeholder="250"
          className="rounded border border-stone-300 px-3 py-2 outline-none focus:border-rose-600"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Photo of the bill
        <input
          required
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="rounded border border-stone-300 px-3 py-2 text-sm"
        />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="rounded bg-rose-700 px-4 py-2 font-medium text-white disabled:opacity-50">
        Submit claim
      </button>
    </form>
  );
}
