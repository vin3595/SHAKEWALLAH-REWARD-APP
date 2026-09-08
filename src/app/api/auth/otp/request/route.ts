import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requestOtp } from "@/lib/otp";
import { getCurrentTenant } from "@/lib/tenant";

const schema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, "Enter a 10-digit phone number."),
  purpose: z.enum(["CUSTOMER", "STAFF"]),
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }
  const { phone, purpose } = body.data;
  const tenant = await getCurrentTenant();

  if (purpose === "STAFF") {
    const staff = await prisma.staffUser.findUnique({
      where: { tenantId_phone: { tenantId: tenant.id, phone } },
    });
    if (!staff) {
      return NextResponse.json({ error: "This number isn't registered as staff." }, { status: 404 });
    }
  }

  const { devCode } = await requestOtp(tenant.id, phone, purpose);
  return NextResponse.json({ ok: true, devCode });
}
