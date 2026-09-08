import { DEFAULT_POINTS_PER_100 } from "@/lib/tiers";

// pointsPer100 = points earned per ₹100 spent — the unit a restaurant's
// tiers are defined in (e.g. Silver 10/₹100, Gold 20/₹100, Platinum 30/₹100).
export function pointsForAmountPaise(amountPaise: number, pointsPer100: number = DEFAULT_POINTS_PER_100) {
  const rupees = amountPaise / 100;
  return Math.floor((rupees * pointsPer100) / 100);
}
