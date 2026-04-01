-- CreateTable
CREATE TABLE "MaintenanceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reporterId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceRequest_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceRequest_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "hourReminderSentAt" DATETIME,
    "consultationType" TEXT NOT NULL DEFAULT 'IN_PERSON',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("consultationFee", "createdAt", "departmentId", "doctorId", "endsAt", "familyMemberId", "hourReminderSentAt", "id", "isWalkIn", "notes", "patientId", "priority", "startsAt", "status", "symptoms", "tokenCode", "triageBpDiastolic", "triageBpSystolic", "triageChiefComplaint", "triageConsciousness", "triagePainLevel", "triagePulse", "triageScore", "triageSpo2", "triageTemperature", "updatedAt") SELECT "consultationFee", "createdAt", "departmentId", "doctorId", "endsAt", "familyMemberId", "hourReminderSentAt", "id", "isWalkIn", "notes", "patientId", "priority", "startsAt", "status", "symptoms", "tokenCode", "triageBpDiastolic", "triageBpSystolic", "triageChiefComplaint", "triageConsciousness", "triagePainLevel", "triagePulse", "triageScore", "triageSpo2", "triageTemperature", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE UNIQUE INDEX "Appointment_tokenCode_key" ON "Appointment"("tokenCode");
CREATE INDEX "Appointment_doctorId_startsAt_idx" ON "Appointment"("doctorId", "startsAt");
CREATE INDEX "Appointment_patientId_startsAt_idx" ON "Appointment"("patientId", "startsAt");
CREATE INDEX "Appointment_departmentId_startsAt_idx" ON "Appointment"("departmentId", "startsAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PATIENT',
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "bloodGroup" TEXT,
    "address" TEXT,
    "photoUrl" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "preferredLanguage" TEXT DEFAULT 'en',
    "notifyWhatsApp" BOOLEAN NOT NULL DEFAULT true,
    "notifySms" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "twoFactorBackupCodes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("address", "bloodGroup", "createdAt", "dateOfBirth", "email", "emergencyContactName", "emergencyContactPhone", "gender", "id", "isActive", "name", "notifyEmail", "notifySms", "notifyWhatsApp", "passwordHash", "phone", "photoUrl", "preferredLanguage", "role", "updatedAt") SELECT "address", "bloodGroup", "createdAt", "dateOfBirth", "email", "emergencyContactName", "emergencyContactPhone", "gender", "id", "isActive", "name", "notifyEmail", "notifySms", "notifyWhatsApp", "passwordHash", "phone", "photoUrl", "preferredLanguage", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MaintenanceRequest_status_createdAt_idx" ON "MaintenanceRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_reporterId_idx" ON "MaintenanceRequest"("reporterId");
