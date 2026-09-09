-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OUTLET_STAFF', 'BRAND_ADMIN');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('CUSTOMER', 'STAFF');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('ISSUED', 'FULFILLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SegmentRuleType" AS ENUM ('INACTIVE_DAYS', 'MIN_LIFETIME_SPEND', 'MIN_VISITS');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SENT');

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "city" TEXT,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "themeJson" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tier" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minLifetimeSpend" INTEGER NOT NULL DEFAULT 0,
    "pointsPer100" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outlet" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "birthday" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tierId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "outletId" TEXT,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'OUTLET_STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT,
    "phone" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillClaim" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsLedgerEntry" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "billClaimId" TEXT,
    "redemptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "stock" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'ISSUED',
    "fulfilledById" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" "SegmentRuleType" NOT NULL,
    "ruleValue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "segmentId" TEXT,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");

-- CreateIndex
CREATE INDEX "Restaurant_active_category_idx" ON "Restaurant"("active", "category");

-- CreateIndex
CREATE INDEX "Tier_restaurantId_minLifetimeSpend_idx" ON "Tier"("restaurantId", "minLifetimeSpend");

-- CreateIndex
CREATE UNIQUE INDEX "Tier_restaurantId_name_key" ON "Tier"("restaurantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Outlet_qrToken_key" ON "Outlet"("qrToken");

-- CreateIndex
CREATE INDEX "Outlet_restaurantId_idx" ON "Outlet"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Membership_restaurantId_idx" ON "Membership"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_customerId_restaurantId_key" ON "Membership"("customerId", "restaurantId");

-- CreateIndex
CREATE INDEX "StaffUser_restaurantId_idx" ON "StaffUser"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_restaurantId_phone_key" ON "StaffUser"("restaurantId", "phone");

-- CreateIndex
CREATE INDEX "OtpCode_phone_purpose_restaurantId_idx" ON "OtpCode"("phone", "purpose", "restaurantId");

-- CreateIndex
CREATE INDEX "BillClaim_customerId_idx" ON "BillClaim"("customerId");

-- CreateIndex
CREATE INDEX "BillClaim_outletId_status_idx" ON "BillClaim"("outletId", "status");

-- CreateIndex
CREATE INDEX "BillClaim_outletId_billDate_idx" ON "BillClaim"("outletId", "billDate");

-- CreateIndex
CREATE UNIQUE INDEX "BillClaim_outletId_billNo_key" ON "BillClaim"("outletId", "billNo");

-- CreateIndex
CREATE UNIQUE INDEX "PointsLedgerEntry_billClaimId_key" ON "PointsLedgerEntry"("billClaimId");

-- CreateIndex
CREATE UNIQUE INDEX "PointsLedgerEntry_redemptionId_key" ON "PointsLedgerEntry"("redemptionId");

-- CreateIndex
CREATE INDEX "PointsLedgerEntry_membershipId_createdAt_idx" ON "PointsLedgerEntry"("membershipId", "createdAt");

-- CreateIndex
CREATE INDEX "Reward_restaurantId_active_idx" ON "Reward"("restaurantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_code_key" ON "Redemption"("code");

-- CreateIndex
CREATE INDEX "Segment_restaurantId_idx" ON "Segment"("restaurantId");

-- CreateIndex
CREATE INDEX "Campaign_restaurantId_idx" ON "Campaign"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_membershipId_key" ON "CampaignRecipient"("campaignId", "membershipId");

-- AddForeignKey
ALTER TABLE "Tier" ADD CONSTRAINT "Tier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "Tier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffUser" ADD CONSTRAINT "StaffUser_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffUser" ADD CONSTRAINT "StaffUser_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillClaim" ADD CONSTRAINT "BillClaim_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillClaim" ADD CONSTRAINT "BillClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsLedgerEntry" ADD CONSTRAINT "PointsLedgerEntry_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsLedgerEntry" ADD CONSTRAINT "PointsLedgerEntry_billClaimId_fkey" FOREIGN KEY ("billClaimId") REFERENCES "BillClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsLedgerEntry" ADD CONSTRAINT "PointsLedgerEntry_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "Redemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
