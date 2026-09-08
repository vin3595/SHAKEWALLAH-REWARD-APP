import { createHmac, timingSafeEqual } from "node:crypto";

// A "live" QR token for redemptions: it's just (redemptionId, code,
// issued-at) signed with an HMAC, re-issued every few seconds by the
// client. A screenshot of the QR stops working once TOKEN_TTL_MS elapses
// — that's the whole point, it closes the "screenshot and share the
// code later" hole a static code/QR has.
const TOKEN_TTL_MS = 15_000;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function signRedemptionToken(redemptionId: string, code: string) {
  const payload = JSON.stringify({ r: redemptionId, c: code, t: Date.now() });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyRedemptionToken(
  token: string
): { redemptionId: string; code: string } | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      r: string;
      c: string;
      t: number;
    };
    if (typeof payload.t !== "number" || Date.now() - payload.t > TOKEN_TTL_MS) return null;
    if (payload.t > Date.now() + 5_000) return null; // reject implausible future timestamps
    return { redemptionId: payload.r, code: payload.c };
  } catch {
    return null;
  }
}
