-- CreateTable
CREATE TABLE "crawl_schedules" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastChapterNum" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crawl_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_configs" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "titleSelector" TEXT,
    "authorSelector" TEXT,
    "coverSelector" TEXT,
    "descSelector" TEXT,
    "genreSelector" TEXT,
    "chapterListSel" TEXT,
    "chapterContentSel" TEXT,
    "chapterTitleSel" TEXT,
    "nextPageSel" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crawl_schedules_storyId_key" ON "crawl_schedules"("storyId");

-- CreateIndex
CREATE INDEX "crawl_schedules_nextRunAt_idx" ON "crawl_schedules"("nextRunAt");

-- CreateIndex
CREATE INDEX "crawl_schedules_isActive_idx" ON "crawl_schedules"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "site_configs_domain_key" ON "site_configs"("domain");

-- AddForeignKey
ALTER TABLE "crawl_schedules" ADD CONSTRAINT "crawl_schedules_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
