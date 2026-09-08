import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/guards";
import { getCustomerBalance } from "@/lib/balance";

const schema = z.object({ rewardId: z.string().min(1) });

function generateCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function POST(req: Request) {
  const { session, error } = await requireCustomer();
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "A reward is required." }, { status: 400 });
  }

  const reward = await prisma.reward.findUnique({ where: { id: body.data.rewardId } });
  if (!reward || reward.tenantId !== session!.tenantId || !reward.active) {
    return NextResponse.json({ error: "Reward not available." }, { status: 404 });
  }
  if (reward.stock !== null && reward.stock <= 0) {
    return NextResponse.json({ error: "This reward is out of stock." }, { status: 409 });
  }

  const balance = await getCustomerBalance(session!.sub);
  if (balance < reward.pointsCost) {
    return NextResponse.json({ error: "Not enough points for this reward." }, { status: 400 });
  }

  const code = generateCode();

  const redemption = await prisma.$transaction(async (tx) => {
    const created = await tx.redemption.create({
      data: { customerId: session!.sub, rewardId: reward.id, code },
    });
    await tx.pointsLedgerEntry.create({
      data: {
        customerId: session!.sub,
        delta: -reward.pointsCost,
        reason: "redemption",
        redemptionId: created.id,
      },
    });
    if (reward.stock !== null) {
      await tx.reward.update({ where: { id: reward.id }, data: { stock: { decrement: 1 } } });
    }
    return created;
  });

  return NextResponse.json({ ok: true, redemptionId: redemption.id, code: redemption.code });
}
