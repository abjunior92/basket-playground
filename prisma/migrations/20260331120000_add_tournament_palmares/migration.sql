-- CreateTable
CREATE TABLE "TournamentPalmares" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "tournamentName" TEXT,
    "firstTeamName" TEXT NOT NULL,
    "firstTeamPlayers" TEXT[],
    "secondTeamName" TEXT NOT NULL,
    "secondTeamPlayers" TEXT[],
    "thirdTeamName" TEXT NOT NULL,
    "thirdTeamPlayers" TEXT[],
    "bestGroupScorerName" TEXT NOT NULL,
    "bestGroupScorerSurname" TEXT NOT NULL,
    "bestGroupScorerPoints" INTEGER NOT NULL,
    "bestFinalsScorerName" TEXT NOT NULL,
    "bestFinalsScorerSurname" TEXT NOT NULL,
    "bestFinalsScorerPoints" INTEGER NOT NULL,
    "sourcePlaygroundId" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentPalmares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPalmares_year_key" ON "TournamentPalmares"("year");
