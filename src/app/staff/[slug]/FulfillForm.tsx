"use client";

import { useState } from "react";
import { QrScanner } from "./QrScanner";

type Match = { code: string; rewardTitle: string; customerName: string | null; customerPhone: string };

export function FulfillForm() {
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [scanning, setScanning] = useState(true);
  const [match, setMatch] = useState<Match | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookupToken(token: string) {
    setScanning(false);
    setMessage(null);
    const res = await fetch("/api/staff/redemptions/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ text: data.error, ok: false });
      return;
    }
    setMatch(data);
  }

  async function fulfill(code: string) {
    setBusy(true);
    const res = await fetch(`/api/redemptions/${code}/fulfill`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMessage({ text: data.error, ok: false });
    setMessage({ text: `Fulfilled: ${data.reward}`, ok: true });
    setMatch(null);
  }

  function reset() {
    setMatch(null);
    setMessage(null);
    setManualCode("");
    setScanning(true);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-700">
          {mode === "scan" ? "Scan customer's QR" : "Enter code manually"}
        </p>
        <button
          onClick={() => {
            setMode(mode === "scan" ? "manual" : "scan");
            reset();
          }}
          className="text-xs text-rose-700 underline"
        >
          {mode === "scan" ? "Enter code manually instead" : "Scan a QR instead"}
        </button>
      </div>

      {mode === "scan" && !match && scanning && <QrScanner onDetect={lookupToken} />}

      {mode === "manual" && !match && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fulfill(manualCode.trim().toUpperCase());
          }}
          className="flex flex-col gap-3"
        >
          <input
            required
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="A1B2C3D4"
            className="rounded border border-stone-300 px-3 py-2 font-mono uppercase tracking-widest outline-none focus:border-rose-600"
          />
          <button disabled={busy} className="self-start rounded bg-rose-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            Mark fulfilled
          </button>
        </form>
      )}

      {match && (
        <div className="flex flex-col gap-2 rounded border border-stone-200 p-3 text-sm">
          <p className="font-medium">{match.customerName ?? match.customerPhone}</p>
          <p className="text-stone-600">Reward: {match.rewardTitle}</p>
          <p className="text-xs text-stone-400">Confirm this is the person in front of you.</p>
          <button
            onClick={() => fulfill(match.code)}
            disabled={busy}
            className="self-start rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Confirm &amp; fulfil
          </button>
        </div>
      )}

      {message && (
        <div className="flex items-center justify-between">
          <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>
          <button onClick={reset} className="text-xs text-stone-500 underline">
            {mode === "scan" ? "Scan another" : "Reset"}
          </button>
        </div>
      )}
    </div>
  );
}
