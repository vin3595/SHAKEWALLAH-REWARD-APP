import { prisma } from "@/lib/prisma";

export async function getRestaurantBySlug(slug: string) {
  return prisma.restaurant.findUnique({ where: { slug } });
}

export async function listActiveRestaurants() {
  return prisma.restaurant.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
}
