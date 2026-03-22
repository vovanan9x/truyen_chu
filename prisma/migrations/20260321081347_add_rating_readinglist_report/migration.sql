-- CreateEnum
CREATE TYPE "ReadingListStatus" AS ENUM ('READING', 'PLAN', 'DROPPED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('WRONG_CHAPTER', 'MISSING_CONTENT', 'DUPLICATE', 'WRONG_STORY', 'OTHER');

-- CreateTable
CREATE TABLE "ratings" (
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("userId","storyId")
);

-- CreateTable
CREATE TABLE "reading_lists" (
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "status" "ReadingListStatus" NOT NULL DEFAULT 'READING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_lists_pkey" PRIMARY KEY ("userId","storyId")
);

-- CreateTable
CREATE TABLE "chapter_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "note" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chapter_reports_chapterId_idx" ON "chapter_reports"("chapterId");

-- CreateIndex
CREATE INDEX "chapter_reports_resolved_idx" ON "chapter_reports"("resolved");

-- CreateIndex
CREATE INDEX "stories_rating_idx" ON "stories"("rating");

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_lists" ADD CONSTRAINT "reading_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_lists" ADD CONSTRAINT "reading_lists_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_reports" ADD CONSTRAINT "chapter_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_reports" ADD CONSTRAINT "chapter_reports_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
