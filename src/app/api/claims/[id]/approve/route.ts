import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { pointsForAmountPaise } from "@/lib/points";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireStaff();
  if (error) return error;
  const { id } = await params;

  const claim = await prisma.billClaim.findUnique({ where: { id }, include: { outlet: true } });
  if (!claim || claim.outlet.tenantId !== session!.tenantId) {
    return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  }
  if (session!.role === "OUTLET_STAFF" && claim.outletId !== session!.outletId) {
    return NextResponse.json({ error: "Not your outlet's claim." }, { status: 403 });
  }
  if (claim.status !== "PENDING") {
    return NextResponse.json({ error: `Claim already ${claim.status.toLowerCase()}.` }, { status: 409 });
  }

  const points = pointsForAmountPaise(claim.amountPaise);

  await prisma.$transaction([
    prisma.billClaim.update({
      where: { id: claim.id },
      data: { status: "APPROVED", reviewedById: session!.sub, reviewedAt: new Date() },
    }),
    prisma.pointsLedgerEntry.create({
      data: {
        customerId: claim.customerId,
        delta: points,
        reason: "bill_claim_approved",
        billClaimId: claim.id,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, pointsAwarded: points });
}
