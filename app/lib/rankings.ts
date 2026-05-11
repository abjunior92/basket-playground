import { type ColorGroup, PrismaClient } from '@prisma/client'
import { type TeamWithPlayoffStats, type TeamWithStatsType } from '~/lib/types'
import { calculateTiebreaker, sortTeamsWithTiebreaker } from '~/lib/utils'

const prisma = new PrismaClient()

export const groupAccentClasses: Record<ColorGroup, string> = {
	red: 'bg-red-500/10 text-red-700 dark:text-red-300',
	blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
	green: 'bg-green-600/10 text-green-700 dark:text-green-300',
	light_green: 'bg-lime-400/20 text-lime-800 dark:text-lime-200',
	yellow: 'bg-yellow-500/20 text-yellow-800 dark:text-yellow-200',
	purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
	orange: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
	pink: 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
	gray: 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
	black: 'bg-slate-900 text-slate-100',
	white: 'bg-white text-slate-800',
	brown: 'bg-amber-900/10 text-amber-900 dark:text-amber-200',
	cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
}

export const groupBorderClasses: Record<ColorGroup, string> = {
	red: 'border-red-500/40',
	blue: 'border-blue-500/40',
	green: 'border-green-600/40',
	light_green: 'border-lime-500/50',
	yellow: 'border-yellow-500/50',
	purple: 'border-purple-500/40',
	orange: 'border-orange-500/40',
	pink: 'border-pink-500/40',
	gray: 'border-gray-500/40',
	black: 'border-white/20',
	white: 'border-slate-300',
	brown: 'border-amber-900/40',
	cyan: 'border-cyan-500/40',
}

export const getRankingsData = async (playgroundId: string) => {
	const teams = await prisma.team.findMany({
		where: { group: { playgroundId } },
		include: {
			group: true,
			matchesAsTeam1: {
				where: { day: { in: [1, 2, 3, 4, 6] } },
				select: {
					id: true,
					winner: true,
					score1: true,
					score2: true,
					day: true,
				},
			},
			matchesAsTeam2: {
				where: { day: { in: [1, 2, 3, 4, 6] } },
				select: {
					id: true,
					winner: true,
					score1: true,
					score2: true,
					day: true,
				},
			},
		},
	})

	const allPlayers = await prisma.player.findMany({
		where: { playgroundId },
		include: {
			team: { include: { group: true } },
		},
	})

	const playerStats = await prisma.playerMatchStats.findMany({
		where: {
			player: {
				playgroundId,
			},
		},
		include: {
			match: {
				select: { day: true },
			},
			player: {
				select: { id: true },
			},
		},
	})

	const playersWithGroupStats = allPlayers.map((player) => {
		const groupMatches = playerStats.filter(
			(stat) =>
				stat.playerId === player.id &&
				stat.match.day !== 5 &&
				stat.match.day !== 7,
		)
		const groupPoints = groupMatches.reduce((sum, stat) => sum + stat.points, 0)

		return {
			...player,
			groupPoints,
		}
	})

	const playersWithFinalsStats = allPlayers.map((player) => {
		const finalsMatches = playerStats.filter(
			(stat) =>
				stat.playerId === player.id &&
				(stat.match.day === 5 || stat.match.day === 7),
		)
		const finalsPoints = finalsMatches.reduce((sum, stat) => sum + stat.points, 0)

		return {
			...player,
			finalsPoints,
		}
	})

	const topPlayersGroups = playersWithGroupStats
		.sort((a, b) => b.groupPoints - a.groupPoints)
		.slice(0, 100)

	const topPlayersFinals = playersWithFinalsStats
		.sort((a, b) => b.finalsPoints - a.finalsPoints)
		.slice(0, 50)

	const groups = teams.reduce(
		(acc, team) => {
			const allMatches = [...team.matchesAsTeam1, ...team.matchesAsTeam2]

			const matchesPlayed = allMatches.filter(
				(match) => match.winner !== null,
			).length
			const matchesWon = allMatches.filter(
				(match) => match.winner === team.id,
			).length

			let pointsScored = 0
			let pointsConceded = 0

			allMatches.forEach((match) => {
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

			const teamData = {
				id: team.id,
				name: team.name,
				matchesPlayed,
				matchesWon,
				pointsScored,
				pointsConceded,
				winPercentage,
				pointsDifference,
				pointsGroup: matchesWon * 2,
			}

			const groupKey = `${team.group.name}_${team.group.color}`
			if (!acc[groupKey]) acc[groupKey] = []

			acc[groupKey]?.push(teamData)
			return acc
		},
		{} as Record<string, TeamWithStatsType[]>,
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
						group[currentIndex + i] = sortedTiedTeams[i]!
					}
				}
			}

			currentIndex = endIndex
		}
	})

	const teamsById = new Map(teams.map((team) => [team.id, team]))

	const buildPlacedTeams = (position: number): TeamWithPlayoffStats[] =>
		Object.values(groups)
			.map((group) => group?.[position])
			.filter((team): team is TeamWithStatsType => team !== undefined)
			.map((team) => {
				const originalTeam = teamsById.get(team.id)
				if (!originalTeam) return null
				return {
					...team,
					group: originalTeam.group,
					groupPosition: position + 1,
				}
			})
			.filter((team): team is TeamWithPlayoffStats => team !== null)

	const sortedFirstPlacedTeams = sortTeamsWithTiebreaker(buildPlacedTeams(0), teams)
	const sortedSecondPlacedTeams = sortTeamsWithTiebreaker(
		buildPlacedTeams(1),
		teams,
	)
	const sortedThirdPlacedTeams = sortTeamsWithTiebreaker(buildPlacedTeams(2), teams)
	const sortedFourthPlacedTeams = sortTeamsWithTiebreaker(
		buildPlacedTeams(3),
		teams,
	)
	const sortedFifthPlacedTeams = sortTeamsWithTiebreaker(buildPlacedTeams(4), teams)

	const directPlayoffTeamIds = [
		...sortedFirstPlacedTeams,
		...sortedSecondPlacedTeams.slice(0, 3),
	].map((team) => team.id)

	const playinTeamIds = [
		...sortedSecondPlacedTeams.slice(3),
		...sortedThirdPlacedTeams,
		...sortedFourthPlacedTeams,
		...sortedFifthPlacedTeams.slice(0, 4),
	].map((team) => team.id)

	return {
		groups,
		topPlayersGroups,
		topPlayersFinals,
		directPlayoffTeamIds,
		playinTeamIds,
	}
}
