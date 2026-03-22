-- CreateIndex
CREATE INDEX "comments_storyId_parentId_createdAt_idx" ON "comments"("storyId", "parentId", "createdAt");

-- CreateIndex
CREATE INDEX "comments_userId_createdAt_idx" ON "comments"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_userId_createdAt_idx" ON "transactions"("userId", "createdAt");
