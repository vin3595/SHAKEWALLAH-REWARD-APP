import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandAdmin } from "@/lib/guards";
import { evaluateSegment } from "@/lib/segments";

// V1 "send" = credit bonus points + log a CampaignRecipient row per
// matched membership. There's no push/SMS delivery yet (see README) —
// this is the CRM data model + rule engine, not the notification layer.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireBrandAdmin();
  if (error) return error;
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id }, include: { segment: true } });
  if (!campaign || campaign.restaurantId !== session!.restaurantId) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  if (campaign.status !== "DRAFT") {
    return NextResponse.json({ error: "Campaign already sent." }, { status: 409 });
  }

  const memberships = campaign.segment
    ? await evaluateSegment(campaign.segment.restaurantId, campaign.segment.ruleType, campaign.segment.ruleValue)
    : await prisma.membership.findMany({ where: { restaurantId: campaign.restaurantId } });

  await prisma.$transaction([
    ...memberships.map((membership) =>
      prisma.campaignRecipient.create({
        data: { campaignId: campaign.id, membershipId: membership.id },
      })
    ),
    ...(campaign.bonusPoints > 0
      ? memberships.map((membership) =>
          prisma.pointsLedgerEntry.create({
            data: { membershipId: membership.id, delta: campaign.bonusPoints, reason: "campaign_bonus" },
          })
        )
      : []),
    prisma.campaign.update({ where: { id: campaign.id }, data: { status: "SENT", sentAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true, recipientCount: memberships.length });
}
