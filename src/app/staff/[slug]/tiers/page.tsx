import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRestaurantBySlug } from "@/lib/restaurant";
import { prisma } from "@/lib/prisma";
import { DEFAULT_POINTS_PER_100 } from "@/lib/tiers";
import { TiersClient } from "./TiersClient";

export default async function TiersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const session = await getSession();
  if (!session || session.kind !== "staff" || session.restaurantId !== restaurant.id) {
    redirect(`/staff/${slug}/login`);
  }
  if (session.role !== "BRAND_ADMIN") redirect(`/staff/${slug}`);

  const tiers = await prisma.tier.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { minLifetimeSpend: "asc" },
    include: { _count: { select: { memberships: true } } },
  });

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-rose-700">{restaurant.name}</p>
        <h1 className="text-lg font-semibold">Loyalty tiers</h1>
        <p className="mt-1 text-sm text-stone-600">
          {tiers.length === 0
            ? `No tiers configured yet — every member earns the platform default (${DEFAULT_POINTS_PER_100} pts per ₹100 spent).`
            : "Members are placed in the highest tier their lifetime spend at this restaurant has crossed, and never drop back down."}
        </p>
      </div>
      <TiersClient
        initialTiers={tiers.map((t) => ({
          id: t.id,
          name: t.name,
          minLifetimeSpend: t.minLifetimeSpend,
          pointsPer100: t.pointsPer100,
          memberCount: t._count.memberships,
        }))}
      />
    </main>
  );
}
