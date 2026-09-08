import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { getRestaurantBySlug } from "@/lib/restaurant";
import { createSessionCookie } from "@/lib/session";

const schema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/),
  code: z.string().length(6),
  purpose: z.enum(["CUSTOMER", "STAFF"]),
  name: z.string().min(1).max(80).optional(),
  restaurantSlug: z.string().optional(),
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }
  const { phone, code, purpose, name, restaurantSlug } = body.data;

  if (purpose === "CUSTOMER") {
    const result = await verifyOtp(null, phone, "CUSTOMER", code);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });

    const customer = await prisma.customer.upsert({
      where: { phone },
      update: {},
      create: { phone, name },
    });
    await createSessionCookie({ kind: "customer", sub: customer.id });
    return NextResponse.json({ ok: true, customerId: customer.id });
  }

  if (!restaurantSlug) {
    return NextResponse.json({ error: "Missing restaurant." }, { status: 400 });
  }
  const restaurant = await getRestaurantBySlug(restaurantSlug);
  if (!restaurant) {
    return NextResponse.json({ error: "Unknown restaurant." }, { status: 404 });
  }

  const result = await verifyOtp(restaurant.id, phone, "STAFF", code);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });

  const staff = await prisma.staffUser.findUniqueOrThrow({
    where: { restaurantId_phone: { restaurantId: restaurant.id, phone } },
  });
  await createSessionCookie({
    kind: "staff",
    sub: staff.id,
    restaurantId: restaurant.id,
    role: staff.role,
    outletId: staff.outletId,
  });
  return NextResponse.json({ ok: true, staffId: staff.id, role: staff.role });
}
