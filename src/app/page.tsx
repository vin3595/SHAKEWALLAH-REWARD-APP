import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, clearSessionCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCustomerBalance } from "@/lib/balance";

async function signOut() {
  "use server";
  await clearSessionCookie();
  redirect("/login");
}

const REASON_LABEL: Record<string, string> = {
  bill_claim_approved: "Bill approved",
  redemption: "Redeemed reward",
};

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.kind === "staff") redirect("/staff");

  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: session.sub } });
  const balance = await getCustomerBalance(customer.id);
  const ledger = await prisma.pointsLedgerEntry.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-rose-700">ShakeWallah Rewards</p>
          <h1 className="text-lg font-semibold">Hi{customer.name ? `, ${customer.name}` : ""}</h1>
        </div>
        <form action={signOut}>
          <button className="text-sm text-stone-500 underline">Sign out</button>
        </form>
      </header>

      <section className="rounded-lg border border-stone-200 bg-white p-6 text-center">
        <p className="text-xs uppercase tracking-wide text-stone-500">Your balance</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums text-rose-700">{balance}</p>
        <p className="text-sm text-stone-500">points</p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/scan/shakewallah-main"
          className="rounded-lg bg-rose-700 px-4 py-3 text-center font-medium text-white"
        >
          Claim points
        </Link>
        <Link
          href="/rewards"
          className="rounded-lg border border-rose-700 px-4 py-3 text-center font-medium text-rose-700"
        >
          Redeem
        </Link>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-stone-700">Recent activity</h2>
        {ledger.length === 0 && (
          <p className="text-sm text-stone-500">Nothing yet — scan a bill to earn your first points.</p>
        )}
        <ul className="flex flex-col divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {ledger.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{REASON_LABEL[entry.reason] ?? entry.reason}</span>
              <span className={`font-mono tabular-nums ${entry.delta >= 0 ? "text-emerald-700" : "text-stone-700"}`}>
                {entry.delta >= 0 ? "+" : ""}
                {entry.delta}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
