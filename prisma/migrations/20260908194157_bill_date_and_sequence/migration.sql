/*
  Warnings:

  - Added the required column `billDate` to the `BillClaim` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BillClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "outletId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "billDate" DATETIME NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillClaim_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BillClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BillClaim" ("amountPaise", "billNo", "createdAt", "customerId", "id", "outletId", "photoUrl", "rejectReason", "reviewedAt", "reviewedById", "status") SELECT "amountPaise", "billNo", "createdAt", "customerId", "id", "outletId", "photoUrl", "rejectReason", "reviewedAt", "reviewedById", "status" FROM "BillClaim";
DROP TABLE "BillClaim";
ALTER TABLE "new_BillClaim" RENAME TO "BillClaim";
CREATE INDEX "BillClaim_customerId_idx" ON "BillClaim"("customerId");
CREATE INDEX "BillClaim_outletId_status_idx" ON "BillClaim"("outletId", "status");
CREATE INDEX "BillClaim_outletId_billDate_idx" ON "BillClaim"("outletId", "billDate");
CREATE UNIQUE INDEX "BillClaim_outletId_billNo_key" ON "BillClaim"("outletId", "billNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
