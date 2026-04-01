-- AlterTable
ALTER TABLE "LabOrder" ADD COLUMN "completedAt" DATETIME;

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN "dispensedAt" DATETIME;
ALTER TABLE "Prescription" ADD COLUMN "dispensedByUserId" TEXT;

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "minThreshold" INTEGER NOT NULL DEFAULT 0,
    "expiry" DATETIME,
    "supplier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "InventoryItem_quantity_idx" ON "InventoryItem"("quantity");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_name_key" ON "InventoryItem"("name");
