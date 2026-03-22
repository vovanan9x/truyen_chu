-- CreateEnum
CREATE TYPE "ErrorLevel" AS ENUM ('INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "level" "ErrorLevel" NOT NULL DEFAULT 'ERROR',
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "path" VARCHAR(500),
    "method" VARCHAR(10),
    "userId" TEXT,
    "metadata" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "error_logs_level_createdAt_idx" ON "error_logs"("level", "createdAt");

-- CreateIndex
CREATE INDEX "error_logs_resolved_createdAt_idx" ON "error_logs"("resolved", "createdAt");

-- CreateIndex
CREATE INDEX "error_logs_createdAt_idx" ON "error_logs"("createdAt");
