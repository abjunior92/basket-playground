import { type PrismaClient, type TournamentFormat } from '@prisma/client'
import {
	computePlayoffQualification,
	getDirectPlayoffDistributionSummary,
	getPlayinDistributionSummary,
	type PlacedTeams,
	resolveTournamentFormat,
} from '~/lib/tournament-format'
import { type TeamWithPlayoffStats } from '~/lib/types'
import { calculateTiebreaker, sortTeamsWithTiebreaker } from '~/lib/utils'

const GROUP_STAGE_DAYS = [1, 2, 3, 4, 6] as const

type TeamWithGroupMatches = {
	id: string
	name: string
	group: TeamWithPlayoffStats['group']
	matchesAsTeam1: Array<{
		id: string
		winner: string | null
		score1: number | null
		score2: number | null
	}>
	matchesAsTeam2: Array<{
		id: string
		winner: string | null
		score1: number | null
		score2: number | null
	}>
}

const buildTeamWithStats = (
	team: TeamWithGroupMatches,
): TeamWithPlayoffStats => {
	const matches = [...team.matchesAsTeam1, ...team.matchesAsTeam2]
	const matchesPlayed = matches.filter((match) => match.winner !== null).length
	const matchesWon = matches.filter((match) => match.winner === team.id).length

	let pointsScored = 0
	let pointsConceded = 0

	matches.forEach((match) => {
		if (match.winner !== null) {
			if (team.matchesAsTeam1.some((m) => m.id === match.id)) {
				pointsScored += match.score1 || 0
				pointsConceded += match.score2 || 0
			} else {
				pointsScored += match.score2 || 0
				pointsConceded += match.score1 || 0
			}
		}
	})

	const pointsDifference = pointsScored - pointsConceded
	const winPercentage = matchesPlayed > 0 ? matchesWon / matchesPlayed : 0

	return {
		id: team.id,
		name: team.name,
		group: team.group,
		matchesPlayed,
		matchesWon,
		pointsScored,
		pointsConceded,
		winPercentage,
		pointsDifference,
		pointsGroup: matchesWon * 2,
		groupPosition: 0,
	}
}

export const buildRankedGroupStandings = (
	teams: TeamWithGroupMatches[],
): Record<string, TeamWithPlayoffStats[]> => {
	const teamsWithStats = teams.map(buildTeamWithStats)

	const groups = teamsWithStats.reduce(
		(acc, team) => {
			const groupKey = `${team.group.name}_${team.group.color}`
			if (!acc[groupKey]) acc[groupKey] = []
			acc[groupKey].push(team)
			return acc
		},
		{} as Record<string, TeamWithPlayoffStats[]>,
	)

	Object.keys(groups).forEach((groupName) => {
		const group = groups[groupName]
		if (!group) return

		group.sort((a, b) => b.winPercentage - a.winPercentage)

		let currentIndex = 0
		while (currentIndex < group.length) {
			const currentTeam = group[currentIndex]
			if (!currentTeam) {
				currentIndex++
				continue
			}

			const currentWinPercentage = currentTeam.winPercentage
			let endIndex = currentIndex + 1

			while (
				endIndex < group.length &&
				group[endIndex]?.winPercentage === currentWinPercentage
			) {
				endIndex++
			}

			if (endIndex - currentIndex > 1) {
				const tiedTeams = group.slice(currentIndex, endIndex).filter(Boolean)
				const sortedTiedTeams = calculateTiebreaker(tiedTeams, teams)

				for (let i = 0; i < sortedTiedTeams.length; i++) {
					if (group[currentIndex + i] && sortedTiedTeams[i]) {
						group[currentIndex + i] = sortedTiedTeams[
							i
						]! as TeamWithPlayoffStats
					}
				}
			}

			currentIndex = endIndex
		}

		group.forEach((team, index) => {
			team.groupPosition = index + 1
		})
	})

	return groups
}

const extractPlacedTeams = (
	groups: Record<string, TeamWithPlayoffStats[]>,
	allTeams: TeamWithGroupMatches[],
): PlacedTeams => {
	const collectAt = (position: number) =>
		Object.values(groups)
			.map((group) => group[position])
			.filter((team): team is TeamWithPlayoffStats => team !== undefined)

	return {
		first: sortTeamsWithTiebreaker(collectAt(0), allTeams),
		second: sortTeamsWithTiebreaker(collectAt(1), allTeams),
		third: sortTeamsWithTiebreaker(collectAt(2), allTeams),
		fourth: sortTeamsWithTiebreaker(collectAt(3), allTeams),
		fifth: sortTeamsWithTiebreaker(collectAt(4), allTeams),
		sixth: sortTeamsWithTiebreaker(collectAt(5), allTeams),
	}
}

export const loadPlayoffQualificationContext = async (
	prisma: PrismaClient,
	playgroundId: string,
) => {
	const playground = await prisma.playground.findUnique({
		where: { id: playgroundId },
		select: { format: true },
	})

	if (!playground) {
		throw new Response('Not Found', { status: 404 })
	}

	const format = resolveTournamentFormat(playground.format)

	const teams = await prisma.team.findMany({
		where: { group: { playgroundId } },
		include: {
			group: true,
			matchesAsTeam1: {
				where: { day: { in: [...GROUP_STAGE_DAYS] } },
				select: { id: true, winner: true, score1: true, score2: true },
			},
			matchesAsTeam2: {
				where: { day: { in: [...GROUP_STAGE_DAYS] } },
				select: { id: true, winner: true, score1: true, score2: true },
			},
		},
	})

	const rankedGroups = buildRankedGroupStandings(teams)
	const placedTeams = extractPlacedTeams(rankedGroups, teams)
	const { directPlayoffTeams, playinTeams } = computePlayoffQualification(
		format,
		placedTeams,
	)

	return {
		format,
		rankedGroups,
		placedTeams,
		directPlayoffTeams,
		playinTeams,
		firstPlacedTeams: placedTeams.first,
		secondPlacedTeams: placedTeams.second,
		thirdPlacedTeams: placedTeams.third,
		fourthPlacedTeams: placedTeams.fourth,
		fifthPlacedTeams: placedTeams.fifth,
		sixthPlacedTeams: placedTeams.sixth,
		directPlayoffSummary: getDirectPlayoffDistributionSummary(
			format,
			placedTeams,
		),
		playinDistributionSummary: getPlayinDistributionSummary(
			format,
			placedTeams,
		),
	}
}

export type PlayoffQualificationContext = Awaited<
	ReturnType<typeof loadPlayoffQualificationContext>
>

export const getPlaygroundFormat = async (
	prisma: PrismaClient,
	playgroundId: string,
): Promise<TournamentFormat> => {
	const playground = await prisma.playground.findUnique({
		where: { id: playgroundId },
		select: { format: true },
	})

	if (!playground) {
		throw new Response('Not Found', { status: 404 })
	}

	return resolveTournamentFormat(playground.format)
}
