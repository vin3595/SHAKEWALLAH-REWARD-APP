import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBrandAdmin } from "@/lib/guards";

const schema = z.object({
  name: z.string().min(1).max(40),
  minLifetimeSpend: z.number().int().min(0),
  pointsPer100: z.number().int().positive(),
});

export async function GET() {
  const { session, error } = await requireBrandAdmin();
  if (error) return error;

  const tiers = await prisma.tier.findMany({
    where: { restaurantId: session!.restaurantId },
    orderBy: { minLifetimeSpend: "asc" },
    include: { _count: { select: { memberships: true } } },
  });
  return NextResponse.json({ tiers });
}

export async function POST(req: Request) {
  const { session, error } = await requireBrandAdmin();
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }

  const clash = await prisma.tier.findFirst({
    where: { restaurantId: session!.restaurantId, minLifetimeSpend: body.data.minLifetimeSpend },
  });
  if (clash) {
    return NextResponse.json({ error: "A tier already starts at that spend threshold." }, { status: 409 });
  }

  const tier = await prisma.tier.create({
    data: { restaurantId: session!.restaurantId, ...body.data },
  });
  return NextResponse.json({ ok: true, tier });
}
