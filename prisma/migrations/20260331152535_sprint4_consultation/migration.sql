-- AlterTable
ALTER TABLE "MedicalRecord" ADD COLUMN "diagnosis" TEXT;
ALTER TABLE "MedicalRecord" ADD COLUMN "followUpAt" DATETIME;
ALTER TABLE "MedicalRecord" ADD COLUMN "notes" TEXT;
ALTER TABLE "MedicalRecord" ADD COLUMN "prescriptionPdfUrl" TEXT;
ALTER TABLE "MedicalRecord" ADD COLUMN "prescriptionQrData" TEXT;
ALTER TABLE "MedicalRecord" ADD COLUMN "vitalsBp" TEXT;
ALTER TABLE "MedicalRecord" ADD COLUMN "vitalsPulse" INTEGER;
ALTER TABLE "MedicalRecord" ADD COLUMN "vitalsTemperature" REAL;
ALTER TABLE "MedicalRecord" ADD COLUMN "vitalsWeight" REAL;

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicalRecordId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "instructions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prescription_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicalRecordId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ORDERED',
    "resultUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LabOrder_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "breakdownJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Prescription_medicalRecordId_idx" ON "Prescription"("medicalRecordId");

-- CreateIndex
CREATE INDEX "LabOrder_medicalRecordId_idx" ON "LabOrder"("medicalRecordId");

-- CreateIndex
CREATE INDEX "Payment_appointmentId_idx" ON "Payment"("appointmentId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
