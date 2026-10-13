-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'VENDOR_STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('PROFILE', 'CONSENT', 'COMPLETE');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL_OTP', 'PHONE_OTP', 'GOOGLE');

-- CreateEnum
CREATE TYPE "ConsentKind" AS ENUM ('TERMS', 'PRIVACY', 'WHATSAPP_MARKETING');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" CITEXT,
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "phoneE164" VARCHAR(16),
    "phoneVerifiedAt" TIMESTAMPTZ(3),
    "fullName" VARCHAR(80),
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "onboardingStep" "OnboardingStep" NOT NULL DEFAULT 'PROFILE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "ConsentKind" NOT NULL,
    "version" VARCHAR(32) NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneE164_key" ON "User"("phoneE164");

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_subject_key" ON "AuthIdentity"("provider", "subject");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_kind_createdAt_idx" ON "ConsentRecord"("userId", "kind", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ───── Hand-written: constraints Prisma can't express (docs/08 §Constraints) ─────

-- Every user can be reached by at least one verified-by-sign-in contact.
ALTER TABLE "User" ADD CONSTRAINT user_has_contact
  CHECK ("email" IS NOT NULL OR "phoneE164" IS NOT NULL);

-- COMPLETE needs a name. Accepted terms can't be a row CHECK; the onboarding service enforces
-- them before setting COMPLETE. A verified phone is deliberately absent (DEC-3): holdDrop
-- enforces it in Phase 2.
ALTER TABLE "User" ADD CONSTRAINT user_complete_requires_identity
  CHECK ("onboardingStep" <> 'COMPLETE' OR "fullName" IS NOT NULL);
