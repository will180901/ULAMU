-- AlterEnum
ALTER TYPE "OtpPurpose" ADD VALUE 'LOGIN_2FA';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "emailTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

