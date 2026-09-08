import { prisma } from "@/lib/prisma";
import type { OtpPurpose } from "@/generated/prisma/client";
import { isSmsConfigured, sendOtpSms } from "@/lib/sms";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Without MSG91 configured, the code is logged server-side and returned
// to the caller so the flow is testable end to end (safe: this only
// happens when no real provider is set up, regardless of environment).
// Once MSG91_AUTH_KEY / MSG91_OTP_TEMPLATE_ID are set, this sends a real
// SMS and never returns the code.
export async function requestOtp(
  restaurantId: string | null,
  phone: string,
  purpose: OtpPurpose
) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: { restaurantId, phone, purpose, code, expiresAt },
  });

  if (isSmsConfigured()) {
    await sendOtpSms(phone, code);
    return { devCode: undefined };
  }

  console.log(`[otp] ${purpose} ${phone} code=${code} (expires in ${OTP_TTL_MINUTES}m)`);
  return { devCode: code };
}

export async function verifyOtp(
  restaurantId: string | null,
  phone: string,
  purpose: OtpPurpose,
  code: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const otp = await prisma.otpCode.findFirst({
    where: { restaurantId, phone, purpose, consumedAt: null },
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
