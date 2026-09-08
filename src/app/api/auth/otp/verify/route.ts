import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { getCurrentTenant } from "@/lib/tenant";
import { createSessionCookie } from "@/lib/session";

const schema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/),
  code: z.string().length(6),
  purpose: z.enum(["CUSTOMER", "STAFF"]),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }
  const { phone, code, purpose, name } = body.data;
  const tenant = await getCurrentTenant();

  const result = await verifyOtp(tenant.id, phone, purpose, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  if (purpose === "CUSTOMER") {
    const customer = await prisma.customer.upsert({
      where: { tenantId_phone: { tenantId: tenant.id, phone } },
      update: {},
      create: { tenantId: tenant.id, phone, name },
    });
    await createSessionCookie({ kind: "customer", sub: customer.id, tenantId: tenant.id });
    return NextResponse.json({ ok: true, customerId: customer.id });
  }

  const staff = await prisma.staffUser.findUniqueOrThrow({
    where: { tenantId_phone: { tenantId: tenant.id, phone } },
  });
  await createSessionCookie({
    kind: "staff",
    sub: staff.id,
    tenantId: tenant.id,
    role: staff.role,
    outletId: staff.outletId,
  });
  return NextResponse.json({ ok: true, staffId: staff.id, role: staff.role });
}
