"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StaffLoginForm({ restaurantSlug }: { restaurantSlug: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, purpose: "STAFF", restaurantSlug }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setDevCode(data.devCode ?? null);
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, purpose: "STAFF", restaurantSlug }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    router.push(`/staff/${restaurantSlug}`);
    router.refresh();
  }

  return (
    <>
      {step === "phone" && (
        <form onSubmit={requestOtp} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Registered phone number
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="9999900001"
              className="rounded border border-stone-300 px-3 py-2 outline-none focus:border-rose-600"
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="rounded bg-rose-700 px-4 py-2 font-medium text-white disabled:opacity-50">
            Send code
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={verifyOtp} className="flex flex-col gap-4">
          <p className="text-sm text-stone-600">Enter the 6-digit code sent to {phone}.</p>
          {devCode && (
            <p className="rounded bg-amber-100 px-3 py-2 text-sm text-amber-900">
              Dev mode — no SMS sent. Your code is <b className="font-mono">{devCode}</b>.
            </p>
          )}
          <input
            required
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="rounded border border-stone-300 px-3 py-2 text-center font-mono text-lg tracking-widest outline-none focus:border-rose-600"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="rounded bg-rose-700 px-4 py-2 font-medium text-white disabled:opacity-50">
            Verify &amp; continue
          </button>
        </form>
      )}
    </>
  );
}
