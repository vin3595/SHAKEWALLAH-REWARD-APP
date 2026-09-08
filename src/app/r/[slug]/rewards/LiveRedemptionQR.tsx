"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

const REFRESH_MS = 5000;

export function LiveRedemptionQR({ redemptionId, initialCode }: { redemptionId: string; initialCode: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<"live" | "done" | "error">("live");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      const res = await fetch(`/api/redemptions/${redemptionId}/live-token`);
      if (cancelled) return;

      if (res.status === 409) {
        setStatus("done");
        return; // stop polling — nothing left to refresh
      }
      if (!res.ok) {
        setStatus("error");
        timer = setTimeout(tick, REFRESH_MS);
        return;
      }
      const data = await res.json();
      setCode(data.code);
      setStatus("live");
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, data.token, { width: 220, margin: 1 }).catch(() => {});
      }
      timer = setTimeout(tick, REFRESH_MS);
    }

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [redemptionId]);

  if (status === "done") {
    return <p className="text-center text-sm font-medium text-emerald-700">Redeemed — enjoy!</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="rounded" />
      <p className="flex items-center gap-1.5 text-xs text-stone-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
        Refreshes automatically — show this to staff
      </p>
      <p className="text-xs text-stone-400">
        Code if scanning isn&apos;t available: <span className="font-mono">{code}</span>
      </p>
      {status === "error" && <p className="text-xs text-red-700">Connection lost — reopen this reward.</p>}
    </div>
  );
}
