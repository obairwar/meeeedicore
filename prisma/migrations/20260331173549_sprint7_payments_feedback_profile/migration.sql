-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "invoiceUrl" TEXT;
ALTER TABLE "Payment" ADD COLUMN "paidAt" DATETIME;
ALTER TABLE "Payment" ADD COLUMN "razorpayOrderId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "razorpayPaymentId" TEXT;

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Feedback_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Feedback_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Doctor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "experienceYears" INTEGER NOT NULL,
    "rating" REAL NOT NULL DEFAULT 4.5,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "consultationFee" INTEGER NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Doctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Doctor_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Doctor" ("bio", "consultationFee", "createdAt", "departmentId", "experienceYears", "id", "name", "photoUrl", "rating", "specialization", "updatedAt", "userId") SELECT "bio", "consultationFee", "createdAt", "departmentId", "experienceYears", "id", "name", "photoUrl", "rating", "specialization", "updatedAt", "userId" FROM "Doctor";
DROP TABLE "Doctor";
ALTER TABLE "new_Doctor" RENAME TO "Doctor";
CREATE UNIQUE INDEX "Doctor_userId_key" ON "Doctor"("userId");
CREATE INDEX "Doctor_departmentId_idx" ON "Doctor"("departmentId");
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("address", "bloodGroup", "createdAt", "dateOfBirth", "email", "gender", "id", "name", "passwordHash", "phone", "role", "updatedAt") SELECT "address", "bloodGroup", "createdAt", "dateOfBirth", "email", "gender", "id", "name", "passwordHash", "phone", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_appointmentId_key" ON "Feedback"("appointmentId");

-- CreateIndex
CREATE INDEX "Feedback_doctorId_createdAt_idx" ON "Feedback"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_patientId_idx" ON "Feedback"("patientId");
