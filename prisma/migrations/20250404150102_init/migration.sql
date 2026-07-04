-- CreateEnum
CREATE TYPE "ColorGroup" AS ENUM ('red', 'blue', 'green', 'light_green', 'yellow', 'purple', 'orange', 'pink', 'gray', 'black', 'white', 'brown', 'cyan');

-- CreateEnum
CREATE TYPE "Sizes" AS ENUM ('xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge', 'xxxlarge');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('serie_b', 'serie_c', 'serie_d', 'prima_divisione', 'promozione', 'u15', 'u17', 'u19', 'u20', 'over', 'mai_giocato', 'free_agent', 'csi', 'campetto', 'basket2all');

-- CreateTable
CREATE TABLE "Playground" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Playground_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" "ColorGroup" NOT NULL,
    "playgroundId" TEXT NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "playgroundId" TEXT NOT NULL,
    "refPhoneNumber" TEXT,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "level" "Level" NOT NULL,
    "paid" BOOLEAN NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "teamId" TEXT NOT NULL,
    "size" "Sizes",
    "playgroundId" TEXT NOT NULL,
    "warnings" INTEGER NOT NULL DEFAULT 0,
    "isExpelled" BOOLEAN NOT NULL DEFAULT false,
    "retired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "playgroundId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "team1Id" TEXT NOT NULL,
    "team2Id" TEXT NOT NULL,
    "score1" INTEGER,
    "score2" INTEGER,
    "winner" TEXT,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerMatchStats" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerMatchStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JerseyStock" (
    "id" TEXT NOT NULL,
    "playgroundId" TEXT NOT NULL,
    "size" "Sizes" NOT NULL,
    "available" INTEGER NOT NULL DEFAULT 0,
    "distributed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JerseyStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreePointChallengeParticipant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "fee" INTEGER NOT NULL,
    "playerId" TEXT,
    "playgroundId" TEXT NOT NULL,

    CONSTRAINT "ThreePointChallengeParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_color_key" ON "Group"("color");

-- CreateIndex
CREATE UNIQUE INDEX "Match_playgroundId_day_timeSlot_field_key" ON "Match"("playgroundId", "day", "timeSlot", "field");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchStats_matchId_playerId_key" ON "PlayerMatchStats"("matchId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "JerseyStock_size_key" ON "JerseyStock"("size");

-- CreateIndex
CREATE UNIQUE INDEX "JerseyStock_playgroundId_size_key" ON "JerseyStock"("playgroundId", "size");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_playgroundId_fkey" FOREIGN KEY ("playgroundId") REFERENCES "Playground"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_playgroundId_fkey" FOREIGN KEY ("playgroundId") REFERENCES "Playground"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_playgroundId_fkey" FOREIGN KEY ("playgroundId") REFERENCES "Playground"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playgroundId_fkey" FOREIGN KEY ("playgroundId") REFERENCES "Playground"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchStats" ADD CONSTRAINT "PlayerMatchStats_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchStats" ADD CONSTRAINT "PlayerMatchStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JerseyStock" ADD CONSTRAINT "JerseyStock_playgroundId_fkey" FOREIGN KEY ("playgroundId") REFERENCES "Playground"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreePointChallengeParticipant" ADD CONSTRAINT "ThreePointChallengeParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreePointChallengeParticipant" ADD CONSTRAINT "ThreePointChallengeParticipant_playgroundId_fkey" FOREIGN KEY ("playgroundId") REFERENCES "Playground"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
