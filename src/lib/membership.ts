import { prisma } from "@/lib/prisma";

export async function getOrCreateMembership(customerId: string, restaurantId: string) {
  const existing = await prisma.membership.findUnique({
    where: { customerId_restaurantId: { customerId, restaurantId } },
  });
  if (existing) return existing;
  return prisma.membership.create({ data: { customerId, restaurantId } });
}

export async function getMembershipBalance(membershipId: string) {
  const result = await prisma.pointsLedgerEntry.aggregate({
    where: { membershipId },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}

// The "My Rewards" home screen: every restaurant this customer has a
// wallet at, with its balance. This is the platform's core proposition —
// one list instead of N separate apps.
export async function listCustomerWallets(customerId: string) {
  const memberships = await prisma.membership.findMany({
    where: { customerId },
    include: { restaurant: true, tier: true },
    orderBy: { joinedAt: "desc" },
  });

  return Promise.all(
    memberships.map(async (membership) => ({
      membershipId: membership.id,
      restaurant: membership.restaurant,
      tier: membership.tier?.name ?? "Member",
      balance: await getMembershipBalance(membership.id),
    }))
  );
}
