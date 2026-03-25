-- Migration: add storyListSel to site_configs table
ALTER TABLE "site_configs" ADD COLUMN IF NOT EXISTS "storyListSel" TEXT;
