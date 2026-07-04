-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('four_groups', 'five_groups');

-- AlterTable
ALTER TABLE "Playground" ADD COLUMN "format" "TournamentFormat" NOT NULL DEFAULT 'five_groups';
