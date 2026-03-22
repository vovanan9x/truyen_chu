-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "gender" "Gender",
ADD COLUMN "hometown" VARCHAR(100),
ADD COLUMN "facebookUrl" VARCHAR(255),
ADD COLUMN "tiktokUrl" VARCHAR(255),
ADD COLUMN "instagramUrl" VARCHAR(255);
