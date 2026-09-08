import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/guards";
import { saveBillPhoto } from "@/lib/storage";
import { checkClaimWindow, checkBillSequence } from "@/lib/billSequence";

// Per-customer, per-day cap across all restaurants — a basic guard
// against someone farming the bill-claim workflow for points abuse.
const DAILY_CLAIM_LIMIT = 5;

export async function POST(req: Request) {
  const { session, error } = await requireCustomer();
  if (error) return error;

  const form = await req.formData();
  const outletToken = String(form.get("outletToken") ?? "");
  const billNo = String(form.get("billNo") ?? "").trim();
  const billDateRaw = String(form.get("billDate") ?? "");
  const amountRupees = Number(form.get("amountRupees"));
  const photo = form.get("photo");

  if (!outletToken || !billNo) {
    return NextResponse.json({ error: "Outlet and bill number are required." }, { status: 400 });
  }
  const billDate = new Date(billDateRaw);
  if (!billDateRaw || Number.isNaN(billDate.getTime())) {
    return NextResponse.json({ error: "Enter the date and time printed on the bill." }, { status: 400 });
  }
  if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
    return NextResponse.json({ error: "Enter a valid bill amount." }, { status: 400 });
  }
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "A photo of the bill is required." }, { status: 400 });
  }

  const windowCheck = checkClaimWindow(billDate);
  if (!windowCheck.ok) {
    return NextResponse.json({ error: windowCheck.reason }, { status: 400 });
  }

  const outlet = await prisma.outlet.findUnique({ where: { qrToken: outletToken } });
  if (!outlet) {
    return NextResponse.json({ error: "Unknown outlet QR code." }, { status: 404 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await prisma.billClaim.count({
    where: { customerId: session!.sub, createdAt: { gte: since }, status: { not: "REJECTED" } },
  });
  if (recentCount >= DAILY_CLAIM_LIMIT) {
    return NextResponse.json({ error: "Daily claim limit reached. Try again tomorrow." }, { status: 429 });
  }

  const duplicate = await prisma.billClaim.findUnique({
    where: { outletId_billNo: { outletId: outlet.id, billNo } },
  });
  if (duplicate) {
    return NextResponse.json({ error: "This bill has already been claimed." }, { status: 409 });
  }

  const sequenceCheck = await checkBillSequence(outlet.id, billNo, billDate);
  if (!sequenceCheck.ok) {
    return NextResponse.json({ error: sequenceCheck.reason }, { status: 409 });
  }

  let photoUrl: string;
  try {
    photoUrl = await saveBillPhoto(photo);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const claim = await prisma.billClaim.create({
    data: {
      outletId: outlet.id,
      customerId: session!.sub,
      billNo,
      billDate,
      amountPaise: Math.round(amountRupees * 100),
      photoUrl,
    },
  });

  return NextResponse.json({ ok: true, claimId: claim.id, status: claim.status });
}
