import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";

export async function GET() {
  const { session, error } = await requireStaff();
  if (error) return error;

  const where =
    session!.role === "BRAND_ADMIN"
      ? { outlet: { tenantId: session!.tenantId }, status: "PENDING" as const }
      : { outletId: session!.outletId ?? "__none__", status: "PENDING" as const };

  const claims = await prisma.billClaim.findMany({
    where,
    include: { customer: { select: { phone: true, name: true } }, outlet: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ claims });
}
