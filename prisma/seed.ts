import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

async function seedRestaurant(input: {
  slug: string;
  name: string;
  category: string;
  city: string;
  description: string;
  primaryColor: string;
  outletName: string;
  qrToken: string;
  adminPhone: string;
  staffPhone: string;
  rewards: { title: string; description: string; pointsCost: number }[];
}) {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: input.slug },
    update: {},
    create: {
      slug: input.slug,
      name: input.name,
      category: input.category,
      city: input.city,
      description: input.description,
      themeJson: JSON.stringify({ primaryColor: input.primaryColor, logoUrl: null }),
    },
  });

  const outlet = await prisma.outlet.upsert({
    where: { qrToken: input.qrToken },
    update: {},
    create: { restaurantId: restaurant.id, name: input.outletName, qrToken: input.qrToken },
  });

  await prisma.staffUser.upsert({
    where: { restaurantId_phone: { restaurantId: restaurant.id, phone: input.adminPhone } },
    update: {},
    create: { restaurantId: restaurant.id, phone: input.adminPhone, name: "Brand Admin", role: "BRAND_ADMIN" },
  });

  await prisma.staffUser.upsert({
    where: { restaurantId_phone: { restaurantId: restaurant.id, phone: input.staffPhone } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      phone: input.staffPhone,
      name: "Outlet Staff",
      role: "OUTLET_STAFF",
      outletId: outlet.id,
    },
  });

  for (const reward of input.rewards) {
    const existing = await prisma.reward.findFirst({
      where: { restaurantId: restaurant.id, title: reward.title },
    });
    if (!existing) {
      await prisma.reward.create({ data: { ...reward, restaurantId: restaurant.id } });
    }
  }

  return { restaurant, outlet };
}

async function main() {
  const shakewallah = await seedRestaurant({
    slug: "shakewallah",
    name: "ShakeWallah",
    category: "Café",
    city: "Bengaluru",
    description: "Thick shakes and cold coffee.",
    primaryColor: "#C13A56",
    outletName: "ShakeWallah — Main Outlet",
    qrToken: "shakewallah-main",
    adminPhone: "9999900001",
    staffPhone: "9999900002",
    rewards: [
      { title: "Free Regular Shake", description: "Any regular-size shake, on the house.", pointsCost: 150 },
      { title: "Free Add-on / Topping", description: "One free topping on your next order.", pointsCost: 60 },
      { title: "20% Off Next Order", description: "20% off your next bill.", pointsCost: 100 },
    ],
  });

  // A second restaurant, purely as demo data — the whole point of the
  // universal platform is that ShakeWallah isn't the only tenant a
  // customer sees. Not a real brand; safe to delete/replace with your
  // next actual restaurant customer.
  const biteBox = await seedRestaurant({
    slug: "bite-box",
    name: "Bite Box",
    category: "QSR",
    city: "Bengaluru",
    description: "Quick bites, burgers and wraps.",
    primaryColor: "#2E7D5B",
    outletName: "Bite Box — Indiranagar",
    qrToken: "bitebox-indiranagar",
    adminPhone: "9999900003",
    staffPhone: "9999900004",
    rewards: [
      { title: "Free Fries", description: "Regular fries, on us.", pointsCost: 40 },
      { title: "Free Combo Meal", description: "Any combo meal, free.", pointsCost: 200 },
    ],
  });

  console.log(`Seeded restaurants: ${shakewallah.restaurant.slug}, ${biteBox.restaurant.slug}`);
  console.log(`ShakeWallah staff logins (OTP): 9999900001 (brand admin), 9999900002 (outlet staff)`);
  console.log(`Bite Box staff logins (OTP): 9999900003 (brand admin), 9999900004 (outlet staff)`);
  console.log(`QR tokens: /scan/${shakewallah.outlet.qrToken}, /scan/${biteBox.outlet.qrToken}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
