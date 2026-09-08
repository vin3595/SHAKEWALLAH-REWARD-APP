import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { verifyRedemptionToken } from "@/lib/redemptionToken";

const schema = z.object({ token: z.string().min(1) });

// Decodes a scanned QR token and returns who it belongs to, so staff can
// do the "is that you?" visual check before the separate fulfil step —
// scanning never fulfils by itself.
export async function POST(req: Request) {
  const { session, error } = await requireStaff();
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const decoded = verifyRedemptionToken(body.data.token);
  if (!decoded) {
    return NextResponse.json({ error: "QR expired — ask the customer to hold it steady and rescan." }, { status: 400 });
  }

  const redemption = await prisma.redemption.findUnique({
    where: { id: decoded.redemptionId },
    include: { membership: { include: { customer: true } }, reward: true },
  });
  if (!redemption || redemption.code !== decoded.code) {
    return NextResponse.json({ error: "Unknown redemption code." }, { status: 404 });
  }
  if (redemption.membership.restaurantId !== session!.restaurantId) {
    return NextResponse.json({ error: "Unknown redemption code." }, { status: 404 });
  }
  if (redemption.status !== "ISSUED") {
    return NextResponse.json({ error: `Code already ${redemption.status.toLowerCase()}.` }, { status: 409 });
  }

  return NextResponse.json({
    code: redemption.code,
    rewardTitle: redemption.reward.title,
    customerName: redemption.membership.customer.name,
    customerPhone: redemption.membership.customer.phone,
  });
}
