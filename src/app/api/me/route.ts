import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCustomerBalance } from "@/lib/balance";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (session.kind === "customer") {
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: session.sub } });
    const balance = await getCustomerBalance(customer.id);
    const ledger = await prisma.pointsLedgerEntry.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({
      kind: "customer",
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      balance,
      ledger,
    });
  }

  const staff = await prisma.staffUser.findUniqueOrThrow({ where: { id: session.sub } });
  return NextResponse.json({
    kind: "staff",
    id: staff.id,
    name: staff.name,
    phone: staff.phone,
    role: staff.role,
    outletId: staff.outletId,
  });
}
