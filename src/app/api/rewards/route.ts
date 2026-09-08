import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";

export async function GET() {
  const tenant = await getCurrentTenant();
  const rewards = await prisma.reward.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { pointsCost: "asc" },
  });
  return NextResponse.json({ rewards });
}
