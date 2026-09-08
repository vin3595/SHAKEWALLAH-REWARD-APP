import { prisma } from "@/lib/prisma";
import type { Tier } from "@/generated/prisma/client";

// The rate a restaurant gets before it configures any tiers, or while a
// membership's lifetime spend hasn't crossed even the lowest defined
// tier's threshold. 10 points per ₹100 spent == 1 point per ₹10, the
// flat rate the platform launched with.
export const DEFAULT_POINTS_PER_100 = 10;

export function effectivePointsPer100(tier: Tier | null) {
  return tier?.pointsPer100 ?? DEFAULT_POINTS_PER_100;
}

export async function getLifetimeSpendRupees(customerId: string, restaurantId: string) {
  const result = await prisma.billClaim.aggregate({
    where: { customerId, status: "APPROVED", outlet: { restaurantId } },
    _sum: { amountPaise: true },
  });
  return (result._sum.amountPaise ?? 0) / 100;
}

// For the customer-facing "Silver · ₹230 more to Gold" display.
export async function getTierProgress(customerId: string, restaurantId: string) {
  const tiers = await prisma.tier.findMany({ where: { restaurantId }, orderBy: { minLifetimeSpend: "asc" } });
  if (tiers.length === 0) return null;

  const spend = await getLifetimeSpendRupees(customerId, restaurantId);
  const currentTier = [...tiers].reverse().find((t) => spend >= t.minLifetimeSpend) ?? null;
  const nextTier = tiers.find((t) => t.minLifetimeSpend > (currentTier?.minLifetimeSpend ?? -1)) ?? null;

  return { spend, currentTier, nextTier };
}

// Tiers are upgrade-only: a membership never drops to a lower tier just
// because thresholds changed. Call this after crediting an approved
// claim's points, once the new spend total is in effect.
export async function recalculateTier(membershipId: string) {
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: membershipId },
    include: { tier: true },
  });

  const tiers = await prisma.tier.findMany({
    where: { restaurantId: membership.restaurantId },
    orderBy: { minLifetimeSpend: "asc" },
  });
  if (tiers.length === 0) return;

  const spend = await getLifetimeSpendRupees(membership.customerId, membership.restaurantId);
  const qualifying = [...tiers].reverse().find((t) => spend >= t.minLifetimeSpend);
  if (!qualifying) return;

  const currentThreshold = membership.tier?.minLifetimeSpend ?? -1;
  if (qualifying.minLifetimeSpend > currentThreshold) {
    await prisma.membership.update({ where: { id: membershipId }, data: { tierId: qualifying.id } });
  }
}
