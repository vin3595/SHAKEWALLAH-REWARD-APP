import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";

const schema = z.object({ reason: z.string().min(1).max(200) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireStaff();
  if (error) return error;
  const { id } = await params;

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
  }

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

  await prisma.billClaim.update({
    where: { id: claim.id },
    data: {
      status: "REJECTED",
      rejectReason: body.data.reason,
      reviewedById: session!.sub,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
