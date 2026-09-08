import { prisma } from "@/lib/prisma";

export const CLAIM_WINDOW_HOURS = 24;
const FUTURE_SKEW_MINUTES = 5;

export function checkClaimWindow(billDate: Date): { ok: true } | { ok: false; reason: string } {
  const now = Date.now();
  const ageMs = now - billDate.getTime();

  if (ageMs < -FUTURE_SKEW_MINUTES * 60 * 1000) {
    return { ok: false, reason: "Bill date/time can't be in the future." };
  }
  if (ageMs > CLAIM_WINDOW_HOURS * 60 * 60 * 1000) {
    return { ok: false, reason: `Bills must be claimed within ${CLAIM_WINDOW_HOURS} hours of the bill date/time.` };
  }
  return { ok: true };
}

// Most receipt numbering (POS or GST-compliant invoicing) is sequential
// over time: a bill dated later never has a smaller number than one
// dated earlier, at the same outlet. Extracting digits handles prefixed
// bill numbers like "INV-1042" or "SW/2024/00234".
function numericSeq(billNo: string): number | null {
  const digits = billNo.match(/\d+/g)?.join("") ?? "";
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

// Checks the new (billNo, billDate) against its immediate neighbors by
// billDate at the same outlet. This is equivalent to checking against
// every existing claim, provided the invariant already holds among them
// — true as long as every prior claim went through this same check.
export async function checkBillSequence(
  outletId: string,
  billNo: string,
  billDate: Date
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const seq = numericSeq(billNo);
  if (seq === null) return { ok: true }; // no digits to compare — skip

  // Strict < / > only: two bills at the exact same timestamp (e.g. two
  // claims minute-rounded into the same datetime-local value) give no
  // usable ordering information, so they're skipped rather than flagged.
  const [predecessor, successor] = await Promise.all([
    prisma.billClaim.findFirst({
      where: { outletId, status: { not: "REJECTED" }, billDate: { lt: billDate } },
      orderBy: { billDate: "desc" },
    }),
    prisma.billClaim.findFirst({
      where: { outletId, status: { not: "REJECTED" }, billDate: { gt: billDate } },
      orderBy: { billDate: "asc" },
    }),
  ]);

  if (predecessor) {
    const predSeq = numericSeq(predecessor.billNo);
    if (predSeq !== null && predSeq >= seq) {
      return {
        ok: false,
        reason: "This bill number looks earlier than one already claimed with an earlier or equal date. Double-check the bill number and date.",
      };
    }
  }

  if (successor) {
    const succSeq = numericSeq(successor.billNo);
    if (succSeq !== null && succSeq <= seq) {
      return {
        ok: false,
        reason: "This bill number looks later than one already claimed with a later or equal date. Double-check the bill number and date.",
      };
    }
  }

  return { ok: true };
}
