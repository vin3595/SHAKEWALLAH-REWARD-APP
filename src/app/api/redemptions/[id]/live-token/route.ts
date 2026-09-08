import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/guards";
import { signRedemptionToken } from "@/lib/redemptionToken";

// Polled by the customer's redemption screen every few seconds to keep
// the QR "live" — see src/lib/redemptionToken.ts for why.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireCustomer();
  if (error) return error;
  const { id } = await params;

  const redemption = await prisma.redemption.findUnique({
    where: { id },
    include: { membership: true },
  });
  if (!redemption || redemption.membership.customerId !== session!.sub) {
    return NextResponse.json({ error: "Redemption not found." }, { status: 404 });
  }
  if (redemption.status !== "ISSUED") {
    return NextResponse.json({ error: `Already ${redemption.status.toLowerCase()}.` }, { status: 409 });
  }

  const token = signRedemptionToken(redemption.id, redemption.code);
  return NextResponse.json({ token, code: redemption.code });
}
