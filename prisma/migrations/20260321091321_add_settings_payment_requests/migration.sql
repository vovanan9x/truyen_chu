-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "payment_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageCoins" INTEGER NOT NULL,
    "packagePrice" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "transactionId" TEXT,
    "note" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_requests_userId_idx" ON "payment_requests"("userId");

-- CreateIndex
CREATE INDEX "payment_requests_status_idx" ON "payment_requests"("status");

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
