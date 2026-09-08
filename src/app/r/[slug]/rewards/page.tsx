import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRestaurantBySlug } from "@/lib/restaurant";
import { prisma } from "@/lib/prisma";
import { getMembershipBalance } from "@/lib/membership";
import { RedeemButton } from "./RedeemButton";

export default async function RestaurantRewardsPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.kind === "staff") redirect("/staff/login");

  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const [rewards, membership] = await Promise.all([
    prisma.reward.findMany({ where: { restaurantId: restaurant.id, active: true }, orderBy: { pointsCost: "asc" } }),
    prisma.membership.findUnique({
      where: { customerId_restaurantId: { customerId: session.sub, restaurantId: restaurant.id } },
    }),
  ]);
  const balance = membership ? await getMembershipBalance(membership.id) : 0;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-rose-700">{restaurant.name}</p>
          <h1 className="text-lg font-semibold">{balance} points available</h1>
        </div>
        <Link href={`/r/${restaurant.slug}`} className="text-sm text-stone-500 underline">
          Back
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {rewards.map((reward) => (
          <li key={reward.id} className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 bg-white p-4">
            <div>
              <p className="font-medium">{reward.title}</p>
              {reward.description && <p className="text-sm text-stone-500">{reward.description}</p>}
              <p className="mt-1 text-sm font-mono text-rose-700">{reward.pointsCost} pts</p>
            </div>
            <RedeemButton rewardId={reward.id} disabled={balance < reward.pointsCost} />
          </li>
        ))}
        {rewards.length === 0 && <p className="text-sm text-stone-500">No rewards configured yet.</p>}
      </ul>
    </main>
  );
}
