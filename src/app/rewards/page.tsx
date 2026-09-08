import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { getCustomerBalance } from "@/lib/balance";
import { RedeemButton } from "./RedeemButton";

export default async function RewardsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.kind === "staff") redirect("/staff");

  const tenant = await getCurrentTenant();
  const [rewards, balance] = await Promise.all([
    prisma.reward.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { pointsCost: "asc" } }),
    getCustomerBalance(session.sub),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Rewards</p>
          <h1 className="text-lg font-semibold">{balance} points available</h1>
        </div>
        <Link href="/" className="text-sm text-stone-500 underline">
          Home
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
