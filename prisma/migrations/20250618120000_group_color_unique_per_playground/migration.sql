-- DropIndex
DROP INDEX IF EXISTS "Group_color_key";

-- CreateIndex
CREATE UNIQUE INDEX "Group_playgroundId_color_key" ON "Group"("playgroundId", "color");
