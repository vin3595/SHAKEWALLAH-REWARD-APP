import { prisma } from "@/lib/prisma";

export async function getCustomerBalance(customerId: string) {
  const result = await prisma.pointsLedgerEntry.aggregate({
    where: { customerId },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}
