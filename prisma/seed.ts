import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "shakewallah" },
    update: {},
    create: {
      slug: "shakewallah",
      name: "ShakeWallah",
      themeJson: JSON.stringify({
        displayName: "ShakeWallah Rewards",
        primaryColor: "#C13A56",
        logoUrl: null,
      }),
    },
  });

  const outlet = await prisma.outlet.upsert({
    where: { qrToken: "shakewallah-main" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "ShakeWallah — Main Outlet",
      qrToken: "shakewallah-main",
    },
  });

  await prisma.staffUser.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: "9999900001" } },
    update: {},
    create: {
      tenantId: tenant.id,
      phone: "9999900001",
      name: "Brand Admin",
      role: "BRAND_ADMIN",
    },
  });

  await prisma.staffUser.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: "9999900002" } },
    update: {},
    create: {
      tenantId: tenant.id,
      phone: "9999900002",
      name: "Outlet Staff",
      role: "OUTLET_STAFF",
      outletId: outlet.id,
    },
  });

  const rewards = [
    { title: "Free Regular Shake", description: "Any regular-size shake, on the house.", pointsCost: 150 },
    { title: "Free Add-on / Topping", description: "One free topping on your next order.", pointsCost: 60 },
    { title: "20% Off Next Order", description: "20% off your next bill.", pointsCost: 100 },
  ];
  for (const reward of rewards) {
    const existing = await prisma.reward.findFirst({
      where: { tenantId: tenant.id, title: reward.title },
    });
    if (!existing) {
      await prisma.reward.create({ data: { ...reward, tenantId: tenant.id } });
    }
  }

  console.log(`Seeded tenant "${tenant.slug}" with outlet QR token "${outlet.qrToken}".`);
  console.log(`Staff logins (OTP): 9999900001 (brand admin), 9999900002 (outlet staff).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
