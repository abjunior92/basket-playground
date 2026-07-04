-- CreateEnum
CREATE TYPE "PlayoffMatchPhase" AS ENUM (
  'final_eight',
  'final_four',
  'semifinal',
  'third_place',
  'final',
  'third_fourth_final',
  'extra'
);

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "matchPhase" "PlayoffMatchPhase";
