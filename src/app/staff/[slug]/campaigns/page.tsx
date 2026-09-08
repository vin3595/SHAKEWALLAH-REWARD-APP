import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRestaurantBySlug } from "@/lib/restaurant";
import { prisma } from "@/lib/prisma";
import { evaluateSegment } from "@/lib/segments";
import { CampaignsClient } from "./CampaignsClient";

export default async function CampaignsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const session = await getSession();
  if (!session || session.kind !== "staff" || session.restaurantId !== restaurant.id) {
    redirect(`/staff/${slug}/login`);
  }
  if (session.role !== "BRAND_ADMIN") redirect(`/staff/${slug}`);

  const [segments, campaigns] = await Promise.all([
    prisma.segment.findMany({ where: { restaurantId: restaurant.id }, orderBy: { createdAt: "desc" } }),
    prisma.campaign.findMany({
      where: { restaurantId: restaurant.id },
      include: { segment: { select: { name: true } }, _count: { select: { recipients: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const segmentsWithCounts = await Promise.all(
    segments.map(async (segment) => ({
      ...segment,
      matchCount: (await evaluateSegment(segment.restaurantId, segment.ruleType, segment.ruleValue)).length,
    }))
  );

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-rose-700">{restaurant.name}</p>
        <h1 className="text-lg font-semibold">Segments &amp; campaigns</h1>
      </div>
      <CampaignsClient
        initialSegments={segmentsWithCounts}
        initialCampaigns={campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          message: c.message,
          bonusPoints: c.bonusPoints,
          status: c.status,
          segmentName: c.segment?.name ?? null,
          recipientCount: c._count.recipients,
        }))}
      />
    </main>
  );
}
