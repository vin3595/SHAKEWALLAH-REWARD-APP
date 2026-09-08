// Default points rule: 1 point per ₹10 spent. Adjust per tenant once the
// rewards catalog needs to vary the rate by brand.
const RUPEES_PER_POINT = 10;

export function pointsForAmountPaise(amountPaise: number) {
  return Math.floor(amountPaise / (RUPEES_PER_POINT * 100));
}
