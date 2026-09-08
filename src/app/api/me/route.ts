import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listCustomerWallets } from "@/lib/membership";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (session.kind === "customer") {
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: session.sub } });
    const wallets = await listCustomerWallets(customer.id);
    return NextResponse.json({
      kind: "customer",
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      wallets,
    });
  }

  const staff = await prisma.staffUser.findUniqueOrThrow({
    where: { id: session.sub },
    include: { restaurant: { select: { name: true, slug: true } } },
  });
  return NextResponse.json({
    kind: "staff",
    id: staff.id,
    name: staff.name,
    phone: staff.phone,
    role: staff.role,
    outletId: staff.outletId,
    restaurant: staff.restaurant,
  });
}
