import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRestaurantBySlug } from "@/lib/restaurant";
import { prisma } from "@/lib/prisma";
import { getMembershipBalance } from "@/lib/membership";
import { getTierProgress } from "@/lib/tiers";

export default async function RestaurantProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.kind === "staff") redirect("/staff/login");

  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const outlets = await prisma.outlet.findMany({ where: { restaurantId: restaurant.id } });
  const membership = await prisma.membership.findUnique({
    where: { customerId_restaurantId: { customerId: session.sub, restaurantId: restaurant.id } },
    include: { tier: true },
  });
  const balance = membership ? await getMembershipBalance(membership.id) : null;
  const progress = await getTierProgress(session.sub, restaurant.id);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 underline">
        ← All restaurants
      </Link>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-rose-700">
          {restaurant.category}
          {restaurant.city ? ` · ${restaurant.city}` : ""}
        </p>
        <h1 className="text-xl font-semibold">{restaurant.name}</h1>
        {restaurant.description && <p className="mt-1 text-sm text-stone-600">{restaurant.description}</p>}
      </div>

      {membership && (
        <section className="rounded-lg border border-stone-200 bg-white p-6 text-center">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            Your balance · {membership.tier?.name ?? "Member"}
          </p>
          <p className="mt-1 text-4xl font-semibold tabular-nums text-rose-700">{balance}</p>
          <p className="text-sm text-stone-500">points</p>
          {progress?.nextTier && (
            <p className="mt-3 text-xs text-stone-500">
              ₹{Math.max(0, progress.nextTier.minLifetimeSpend - progress.spend).toLocaleString("en-IN")} more spend
              to reach {progress.nextTier.name}
            </p>
          )}
        </section>
      )}

      <Link
        href={`/r/${restaurant.slug}/rewards`}
        className="rounded-lg bg-rose-700 px-4 py-3 text-center font-medium text-white"
      >
        View rewards
      </Link>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-stone-700">Outlets — scan to earn</h2>
        <ul className="flex flex-col gap-2">
          {outlets.map((outlet) => (
            <li key={outlet.id}>
              <Link
                href={`/scan/${outlet.qrToken}`}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium">{outlet.name}</p>
                  {outlet.address && <p className="text-xs text-stone-500">{outlet.address}</p>}
                </div>
                <span className="text-sm text-rose-700">Scan →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
