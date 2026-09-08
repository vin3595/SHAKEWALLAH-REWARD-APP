import { prisma } from "@/lib/prisma";
import type { OtpPurpose } from "@/generated/prisma/client";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Dev mode has no SMS provider wired up: the code is logged server-side
// and (outside production) also returned to the caller so the flow is
// testable end to end. Wire a real provider (MSG91 recommended for
// Indian numbers) here before going live.
export async function requestOtp(
  tenantId: string,
  phone: string,
  purpose: OtpPurpose
) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: { tenantId, phone, purpose, code, expiresAt },
  });

  console.log(`[otp] ${purpose} ${phone} code=${code} (expires in ${OTP_TTL_MINUTES}m)`);

  return { devCode: process.env.NODE_ENV === "production" ? undefined : code };
}

export async function verifyOtp(
  tenantId: string,
  phone: string,
  purpose: OtpPurpose,
  code: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const otp = await prisma.otpCode.findFirst({
    where: { tenantId, phone, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return { ok: false, reason: "No code requested for this number." };
  if (otp.expiresAt < new Date()) return { ok: false, reason: "Code expired, request a new one." };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "Too many attempts, request a new code." };

  if (otp.code !== code) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "Incorrect code." };
  }

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}
