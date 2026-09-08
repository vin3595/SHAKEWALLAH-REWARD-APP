import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";

// Staff enter the code shown on the customer's phone, so this route is
// looked up by code, not by id — `id` in the URL is the code itself.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireStaff();
  if (error) return error;
  const { id: code } = await params;

  const redemption = await prisma.redemption.findUnique({
    where: { code: code.toUpperCase() },
    include: { customer: true, reward: true },
  });
  if (!redemption || redemption.customer.tenantId !== session!.tenantId) {
    return NextResponse.json({ error: "Unknown redemption code." }, { status: 404 });
  }
  if (redemption.status !== "ISSUED") {
    return NextResponse.json({ error: `Code already ${redemption.status.toLowerCase()}.` }, { status: 409 });
  }

  await prisma.redemption.update({
    where: { id: redemption.id },
    data: { status: "FULFILLED", fulfilledById: session!.sub, fulfilledAt: new Date() },
  });

  return NextResponse.json({ ok: true, reward: redemption.reward.title });
}
