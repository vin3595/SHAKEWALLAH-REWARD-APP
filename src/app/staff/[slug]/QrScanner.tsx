"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

const SCAN_INTERVAL_MS = 250;

// Reads QR codes from the device camera using jsQR against sampled video
// frames — no native deps, works in any browser with getUserMedia.
export function QrScanner({ onDetect }: { onDetect: (data: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let interval: ReturnType<typeof setInterval>;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        setError("Couldn't access the camera. Check permissions, or enter the code manually.");
        return;
      }
      if (stopped || !videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      interval = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.videoWidth === 0) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(frame.data, frame.width, frame.height);
        if (result) onDetect(result.data);
      }, SCAN_INTERVAL_MS);
    }

    start();
    return () => {
      stopped = true;
      clearInterval(interval);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <p className="rounded bg-amber-100 px-3 py-2 text-sm text-amber-900">{error}</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-black">
      <video ref={videoRef} muted playsInline className="aspect-square w-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
