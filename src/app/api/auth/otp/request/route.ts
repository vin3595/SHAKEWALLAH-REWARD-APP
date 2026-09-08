import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requestOtp } from "@/lib/otp";
import { getRestaurantBySlug } from "@/lib/restaurant";

const schema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, "Enter a 10-digit phone number."),
  purpose: z.enum(["CUSTOMER", "STAFF"]),
  restaurantSlug: z.string().optional(),
});

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }
  const { phone, purpose, restaurantSlug } = body.data;

  let restaurantId: string | null = null;
  if (purpose === "STAFF") {
    if (!restaurantSlug) {
      return NextResponse.json({ error: "Missing restaurant." }, { status: 400 });
    }
    const restaurant = await getRestaurantBySlug(restaurantSlug);
    if (!restaurant) {
      return NextResponse.json({ error: "Unknown restaurant." }, { status: 404 });
    }
    const staff = await prisma.staffUser.findUnique({
      where: { restaurantId_phone: { restaurantId: restaurant.id, phone } },
    });
    if (!staff) {
      return NextResponse.json({ error: "This number isn't registered as staff here." }, { status: 404 });
    }
    restaurantId = restaurant.id;
  }

  try {
    const { devCode } = await requestOtp(restaurantId, phone, purpose);
    return NextResponse.json({ ok: true, devCode });
  } catch (err) {
    console.error("[otp] send failed", err);
    return NextResponse.json({ error: "Couldn't send the code. Try again shortly." }, { status: 502 });
  }
}
