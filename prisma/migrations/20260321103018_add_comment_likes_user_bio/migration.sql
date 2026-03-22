-- AlterTable
ALTER TABLE "comments" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "parentId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- AlterTable
ALTER TABLE "users" ADD COLUMN "bio" TEXT;

-- CreateTable
CREATE TABLE "comment_likes" (
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("userId","commentId")
);

-- DropIndex
DROP INDEX IF EXISTS "comments_storyId_idx";

-- CreateIndex
CREATE INDEX "comments_storyId_createdAt_idx" ON "comments"("storyId", "createdAt");

-- CreateIndex
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
