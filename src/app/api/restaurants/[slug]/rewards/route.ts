import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantBySlug } from "@/lib/restaurant";
import { getSession } from "@/lib/session";
import { getMembershipBalance } from "@/lib/membership";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  const rewards = await prisma.reward.findMany({
    where: { restaurantId: restaurant.id, active: true },
    orderBy: { pointsCost: "asc" },
  });

  let balance = 0;
  const session = await getSession();
  if (session?.kind === "customer") {
    const membership = await prisma.membership.findUnique({
      where: { customerId_restaurantId: { customerId: session.sub, restaurantId: restaurant.id } },
    });
    if (membership) balance = await getMembershipBalance(membership.id);
  }

  return NextResponse.json({ restaurant, rewards, balance });
}
