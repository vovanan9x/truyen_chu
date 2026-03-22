-- CreateEnum
CREATE TYPE "ChapterStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RoleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WithdrawStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'AUTHOR';
ALTER TYPE "Role" ADD VALUE 'TRANSLATOR';

-- AlterTable
ALTER TABLE "chapters" ADD COLUMN     "publishStatus" "ChapterStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "comments" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "commissionRate" INTEGER NOT NULL DEFAULT 70,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "ownerType" TEXT,
ADD COLUMN     "sourceAuthor" TEXT,
ADD COLUMN     "sourceLanguage" TEXT,
ADD COLUMN     "totalEarnings" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestRole" "Role" NOT NULL,
    "reason" TEXT NOT NULL,
    "portfolio" TEXT,
    "status" "RoleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdraw_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "netCoins" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "accountInfo" TEXT NOT NULL,
    "status" "WithdrawStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdraw_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "role_requests_userId_idx" ON "role_requests"("userId");

-- CreateIndex
CREATE INDEX "role_requests_status_idx" ON "role_requests"("status");

-- CreateIndex
CREATE INDEX "withdraw_requests_userId_idx" ON "withdraw_requests"("userId");

-- CreateIndex
CREATE INDEX "withdraw_requests_status_idx" ON "withdraw_requests"("status");

-- CreateIndex
CREATE INDEX "stories_ownerId_idx" ON "stories"("ownerId");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_requests" ADD CONSTRAINT "role_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
