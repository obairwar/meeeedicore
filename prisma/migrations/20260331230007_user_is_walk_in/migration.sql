-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "twoFactorBackupCodes" TEXT,
    "pushSubscriptionJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("address", "bloodGroup", "createdAt", "dateOfBirth", "email", "emergencyContactName", "emergencyContactPhone", "gender", "id", "isActive", "name", "notifyEmail", "notifySms", "notifyWhatsApp", "passwordHash", "phone", "photoUrl", "preferredLanguage", "pushSubscriptionJson", "role", "twoFactorBackupCodes", "twoFactorEnabled", "twoFactorSecret", "updatedAt") SELECT "address", "bloodGroup", "createdAt", "dateOfBirth", "email", "emergencyContactName", "emergencyContactPhone", "gender", "id", "isActive", "name", "notifyEmail", "notifySms", "notifyWhatsApp", "passwordHash", "phone", "photoUrl", "preferredLanguage", "pushSubscriptionJson", "role", "twoFactorBackupCodes", "twoFactorEnabled", "twoFactorSecret", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
