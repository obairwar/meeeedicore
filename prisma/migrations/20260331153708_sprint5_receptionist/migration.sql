-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ward" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "patientId" TEXT,
    "admittedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bed_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "checkedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedOutAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Visitor_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
    "triageScore" INTEGER,
    "triageBpSystolic" INTEGER,
    "triageBpDiastolic" INTEGER,
    "triagePulse" INTEGER,
    "triageTemperature" REAL,
    "triageSpo2" INTEGER,
    "triagePainLevel" INTEGER,
    "triageConsciousness" TEXT,
    "triageChiefComplaint" TEXT,
    "patientId" TEXT NOT NULL,
    "familyMemberId" TEXT,
    "departmentId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "symptoms" TEXT NOT NULL,
    "notes" TEXT,
    "consultationFee" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("consultationFee", "createdAt", "departmentId", "doctorId", "endsAt", "familyMemberId", "id", "notes", "patientId", "priority", "startsAt", "status", "symptoms", "tokenCode", "updatedAt") SELECT "consultationFee", "createdAt", "departmentId", "doctorId", "endsAt", "familyMemberId", "id", "notes", "patientId", "priority", "startsAt", "status", "symptoms", "tokenCode", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE UNIQUE INDEX "Appointment_tokenCode_key" ON "Appointment"("tokenCode");
CREATE INDEX "Appointment_doctorId_startsAt_idx" ON "Appointment"("doctorId", "startsAt");
CREATE INDEX "Appointment_patientId_startsAt_idx" ON "Appointment"("patientId", "startsAt");
CREATE INDEX "Appointment_departmentId_startsAt_idx" ON "Appointment"("departmentId", "startsAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Bed_status_idx" ON "Bed"("status");

-- CreateIndex
CREATE INDEX "Bed_ward_idx" ON "Bed"("ward");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_ward_bedNumber_key" ON "Bed"("ward", "bedNumber");

-- CreateIndex
CREATE INDEX "Visitor_patientId_checkedOutAt_idx" ON "Visitor"("patientId", "checkedOutAt");

-- CreateIndex
CREATE INDEX "Visitor_checkedInAt_idx" ON "Visitor"("checkedInAt");
