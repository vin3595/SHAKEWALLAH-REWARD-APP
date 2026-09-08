import { prisma } from "@/lib/prisma";
import type { SegmentRuleType } from "@/generated/prisma/client";

// Segments are rules, evaluated on demand — not a stored snapshot — so
// they stay accurate as customers keep earning and spending. Dataset
// sizes at this stage are small enough that per-membership evaluation in
// JS is fine; move to SQL aggregation before this needs to scale.
export async function evaluateSegment(
  restaurantId: string,
  ruleType: SegmentRuleType,
  ruleValue: number
) {
  const memberships = await prisma.membership.findMany({
    where: { restaurantId },
    include: { customer: true },
  });

  const matches: typeof memberships = [];

  for (const membership of memberships) {
    if (ruleType === "INACTIVE_DAYS") {
      const lastEntry = await prisma.pointsLedgerEntry.findFirst({
        where: { membershipId: membership.id },
        orderBy: { createdAt: "desc" },
      });
      const lastActivity = lastEntry?.createdAt ?? membership.joinedAt;
      const daysSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= ruleValue) matches.push(membership);
      continue;
    }

    if (ruleType === "MIN_VISITS") {
      const visits = await prisma.billClaim.count({
        where: { customerId: membership.customerId, outlet: { restaurantId }, status: "APPROVED" },
      });
      if (visits >= ruleValue) matches.push(membership);
      continue;
    }

    if (ruleType === "MIN_LIFETIME_SPEND") {
      const spend = await prisma.billClaim.aggregate({
        where: { customerId: membership.customerId, outlet: { restaurantId }, status: "APPROVED" },
        _sum: { amountPaise: true },
      });
      const rupees = (spend._sum.amountPaise ?? 0) / 100;
      if (rupees >= ruleValue) matches.push(membership);
      continue;
    }
  }

  return matches;
}
