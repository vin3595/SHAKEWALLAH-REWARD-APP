import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/restaurant";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }
  const outlets = await prisma.outlet.findMany({
    where: { restaurantId: restaurant.id },
    select: { id: true, name: true, address: true, qrToken: true },
  });
  return NextResponse.json({ restaurant, outlets });
}
