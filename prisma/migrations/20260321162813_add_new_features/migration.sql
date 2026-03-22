-- AlterTable
ALTER TABLE "users" ADD COLUMN     "banExpiry" TIMESTAMP(3),
ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "followerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isBanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "banned_words" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banned_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "author_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_transfers" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "message" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banned_words_word_key" ON "banned_words"("word");

-- CreateIndex
CREATE INDEX "banned_words_isActive_idx" ON "banned_words"("isActive");

-- CreateIndex
CREATE INDEX "author_follows_followerId_idx" ON "author_follows"("followerId");

-- CreateIndex
CREATE INDEX "author_follows_authorId_idx" ON "author_follows"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "author_follows_followerId_authorId_key" ON "author_follows"("followerId", "authorId");

-- CreateIndex
CREATE INDEX "coin_transfers_fromUserId_createdAt_idx" ON "coin_transfers"("fromUserId", "createdAt");

-- CreateIndex
CREATE INDEX "coin_transfers_toUserId_createdAt_idx" ON "coin_transfers"("toUserId", "createdAt");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isBanned_idx" ON "users"("isBanned");

-- CreateIndex
CREATE INDEX "users_xp_idx" ON "users"("xp");

-- AddForeignKey
ALTER TABLE "author_follows" ADD CONSTRAINT "author_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_follows" ADD CONSTRAINT "author_follows_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transfers" ADD CONSTRAINT "coin_transfers_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transfers" ADD CONSTRAINT "coin_transfers_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
