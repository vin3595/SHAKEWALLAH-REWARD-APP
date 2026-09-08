import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBrandAdmin } from "@/lib/guards";

const schema = z.object({
  name: z.string().min(1).max(80),
  message: z.string().min(1).max(300),
  bonusPoints: z.number().int().min(0).default(0),
  segmentId: z.string().optional(),
});

export async function GET() {
  const { session, error } = await requireBrandAdmin();
  if (error) return error;

  const campaigns = await prisma.campaign.findMany({
    where: { restaurantId: session!.restaurantId },
    include: { segment: { select: { name: true } }, _count: { select: { recipients: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  const { session, error } = await requireBrandAdmin();
  if (error) return error;

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }

  if (body.data.segmentId) {
    const segment = await prisma.segment.findUnique({ where: { id: body.data.segmentId } });
    if (!segment || segment.restaurantId !== session!.restaurantId) {
      return NextResponse.json({ error: "Segment not found." }, { status: 404 });
    }
  }

  const campaign = await prisma.campaign.create({
    data: { restaurantId: session!.restaurantId, ...body.data },
  });

  return NextResponse.json({ ok: true, campaign });
}
