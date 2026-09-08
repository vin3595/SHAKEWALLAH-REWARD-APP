import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, clearSessionCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listCustomerWallets } from "@/lib/membership";
import { listActiveRestaurants } from "@/lib/restaurant";

async function signOut() {
  "use server";
  await clearSessionCookie();
  redirect("/login");
}

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.kind === "staff") redirect(`/staff/login`);

  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: session.sub } });
  const wallets = await listCustomerWallets(customer.id);
  const memberRestaurantIds = new Set(wallets.map((w) => w.restaurant.id));

  const allRestaurants = await listActiveRestaurants();
  const discover = allRestaurants.filter((r) => !memberRestaurantIds.has(r.id));

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Rewards</p>
          <h1 className="text-lg font-semibold">Hi{customer.name ? `, ${customer.name}` : ""}</h1>
        </div>
        <form action={signOut}>
          <button className="text-sm text-stone-500 underline">Sign out</button>
        </form>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-stone-700">My Rewards</h2>
        {wallets.length === 0 && (
          <p className="text-sm text-stone-500">
            No wallets yet — scan a QR code at any restaurant below to start earning.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {wallets.map((wallet) => (
            <li key={wallet.membershipId}>
              <Link
                href={`/r/${wallet.restaurant.slug}`}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium">{wallet.restaurant.name}</p>
                  <p className="text-xs text-stone-500">
                    {wallet.restaurant.category} · {wallet.tier}
                  </p>
                </div>
                <p className="font-mono text-lg font-semibold tabular-nums text-rose-700">{wallet.balance}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-stone-700">Discover restaurants</h2>
        <ul className="flex flex-col gap-2">
          {discover.map((restaurant) => (
            <li key={restaurant.id}>
              <Link
                href={`/r/${restaurant.slug}`}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium">{restaurant.name}</p>
                  <p className="text-xs text-stone-500">
                    {restaurant.category}
                    {restaurant.city ? ` · ${restaurant.city}` : ""}
                  </p>
                </div>
                <span className="text-sm text-rose-700">View →</span>
              </Link>
            </li>
          ))}
          {discover.length === 0 && (
            <p className="text-sm text-stone-500">You&apos;re a member everywhere on the platform already.</p>
          )}
        </ul>
      </section>
    </main>
  );
}
