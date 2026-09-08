import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBrandAdmin } from "@/lib/guards";
import { evaluateSegment } from "@/lib/segments";

const schema = z.object({
  name: z.string().min(1).max(80),
  ruleType: z.enum(["INACTIVE_DAYS", "MIN_LIFETIME_SPEND", "MIN_VISITS"]),
  ruleValue: z.number().int().positive(),
});

export async function GET() {
  const { session, error } = await requireBrandAdmin();
  if (error) return error;

  const segments = await prisma.segment.findMany({
    where: { restaurantId: session!.restaurantId },
    orderBy: { createdAt: "desc" },
  });

  const withCounts = await Promise.all(
    segments.map(async (segment) => ({
      ...segment,
      matchCount: (await evaluateSegment(segment.restaurantId, segment.ruleType, segment.ruleValue)).length,
    }))
  );

  return NextResponse.json({ segments: withCounts });
}

export async function POST(req: Request) {
  const { session, error } = await requireBrandAdmin();
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }

  const segment = await prisma.segment.create({
    data: { restaurantId: session!.restaurantId, ...body.data },
  });
  const matchCount = (await evaluateSegment(segment.restaurantId, segment.ruleType, segment.ruleValue)).length;

  return NextResponse.json({ ok: true, segment, matchCount });
}
