-- CreateEnum
CREATE TYPE "Role" AS ENUM ('READER', 'ADMIN');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('ONGOING', 'COMPLETED', 'HIATUS');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'UNLOCK', 'DONATE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "passwordHash" TEXT,
    "coinBalance" INTEGER NOT NULL DEFAULT 0,
    "role" "Role" NOT NULL DEFAULT 'READER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "author" TEXT,
    "status" "StoryStatus" NOT NULL DEFAULT 'ONGOING',
    "sourceUrl" TEXT,
    "sourceName" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "chapterNum" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "coinCost" INTEGER NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_genres" (
    "storyId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "story_genres_pkey" PRIMARY KEY ("storyId","genreId")
);

-- CreateTable
CREATE TABLE "reading_history" (
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "lastChapterId" TEXT,
    "lastChapterNum" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_history_pkey" PRIMARY KEY ("userId","storyId")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("userId","storyId")
);

-- CreateTable
CREATE TABLE "unlocked_chapters" (
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unlocked_chapters_pkey" PRIMARY KEY ("userId","chapterId")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "coinAmount" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerRef" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "stories_slug_key" ON "stories"("slug");

-- CreateIndex
CREATE INDEX "stories_slug_idx" ON "stories"("slug");

-- CreateIndex
CREATE INDEX "stories_status_idx" ON "stories"("status");

-- CreateIndex
CREATE INDEX "stories_createdAt_idx" ON "stories"("createdAt");

-- CreateIndex
CREATE INDEX "stories_viewCount_idx" ON "stories"("viewCount");

-- CreateIndex
CREATE INDEX "stories_isFeatured_idx" ON "stories"("isFeatured");

-- CreateIndex
CREATE INDEX "chapters_storyId_idx" ON "chapters"("storyId");

-- CreateIndex
CREATE INDEX "chapters_storyId_chapterNum_idx" ON "chapters"("storyId", "chapterNum");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_storyId_chapterNum_key" ON "chapters"("storyId", "chapterNum");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "comments_storyId_idx" ON "comments"("storyId");

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_genres" ADD CONSTRAINT "story_genres_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_genres" ADD CONSTRAINT "story_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_lastChapterId_fkey" FOREIGN KEY ("lastChapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unlocked_chapters" ADD CONSTRAINT "unlocked_chapters_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
