import { type PrismaClient } from '@prisma/client'
import { getTournamentDayCandidates } from '~/lib/utils'

export type TournamentHighlight = {
	key: string
	icon: string
	title: string
	text: string
	meta: string
}

export const getTournamentHighlightsByDay = async (
	prisma: PrismaClient,
	playgroundId: string,
	selectedDayRaw?: string | null,
): Promise<{
	highlights: TournamentHighlight[]
	availableDays: number[]
	selectedDay: number | null
}> => {
	const matches = await prisma.match.findMany({
		where: { playgroundId },
		include: {
			team1: true,
			team2: true,
		},
		orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
	})

	const completedMatches = matches.filter(
		(match) =>
			match.winner !== null && match.score1 !== null && match.score2 !== null,
	)
	const availableDays = Array.from(
		new Set(completedMatches.map((m) => m.day)),
	).sort((a, b) => b - a)

	if (availableDays.length === 0) {
		return { highlights: [], availableDays: [], selectedDay: null }
	}

	const selectedDayFromQuery = selectedDayRaw ? Number(selectedDayRaw) : null
	const hasValidSelectedDay =
		selectedDayFromQuery !== null &&
		!Number.isNaN(selectedDayFromQuery) &&
		availableDays.includes(selectedDayFromQuery)
	const currentDayCandidates = getTournamentDayCandidates(new Date())
	const currentAvailableDay = currentDayCandidates.find((day) =>
		availableDays.includes(day),
	)
	const selectedDay = hasValidSelectedDay
		? selectedDayFromQuery
		: (currentAvailableDay ?? availableDays[0] ?? null)

	if (selectedDay === null) {
		return { highlights: [], availableDays, selectedDay: null }
	}
	const dayMatches = completedMatches.filter(
		(match) => match.day === selectedDay,
	)

	const biggestWin = dayMatches.reduce<(typeof dayMatches)[number] | null>(
		(acc, match) => {
			if (!acc) return match
			const currentGap = Math.abs((match.score1 ?? 0) - (match.score2 ?? 0))
			const bestGap = Math.abs((acc.score1 ?? 0) - (acc.score2 ?? 0))
			return currentGap > bestGap ? match : acc
		},
		null,
	)

	const closestMatch = dayMatches.reduce<(typeof dayMatches)[number] | null>(
		(acc, match) => {
			if (!acc) return match
			const currentGap = Math.abs((match.score1 ?? 0) - (match.score2 ?? 0))
			const bestGap = Math.abs((acc.score1 ?? 0) - (acc.score2 ?? 0))
			return currentGap < bestGap ? match : acc
		},
		null,
	)

	let topScorerOfDay: {
		playerName: string
		teamName: string
		day: number
		points: number
	} | null = null
	let topThreePointLeader: {
		playerName: string
		score: number
	} | null = null

	if (selectedDay !== null) {
		const dayStats = await prisma.playerMatchStats.findMany({
			where: {
				match: {
					playgroundId,
					day: selectedDay,
				},
			},
			include: {
				player: {
					include: {
						team: true,
					},
				},
			},
		})

		const scorerByPlayer = dayStats.reduce<
			Record<string, { playerName: string; teamName: string; points: number }>
		>((acc, stat) => {
			if (!acc[stat.playerId]) {
				acc[stat.playerId] = {
					playerName: `${stat.player.name} ${stat.player.surname}`,
					teamName: stat.player.team.name,
					points: 0,
				}
			}
			acc[stat.playerId]!.points += stat.points
			return acc
		}, {})

		const best = Object.values(scorerByPlayer).sort(
			(a, b) => b.points - a.points,
		)[0]
		if (best) {
			topScorerOfDay = {
				playerName: best.playerName,
				teamName: best.teamName,
				day: selectedDay,
				points: best.points,
			}
		}
	}

	const threePointLeader = await prisma.threePointChallengeParticipant.findFirst({
		where: { playgroundId },
		orderBy: [{ score: 'desc' }, { surname: 'asc' }, { name: 'asc' }],
	})
	if (threePointLeader) {
		topThreePointLeader = {
			playerName: `${threePointLeader.name} ${threePointLeader.surname}`,
			score: threePointLeader.score,
		}
	}

	const highlights = [
		biggestWin
			? {
					key: `biggest-${biggestWin.id}`,
					icon: '🔥',
					title: 'Vittoria con più margine',
					text: `${biggestWin.team1.name} ${biggestWin.score1} - ${biggestWin.score2} ${biggestWin.team2.name}`,
					meta: `Scarto di ${Math.abs((biggestWin.score1 ?? 0) - (biggestWin.score2 ?? 0))} punti`,
				}
			: null,
		closestMatch
			? {
					key: `closest-${closestMatch.id}`,
					icon: '⚖️',
					title: 'Partita più equilibrata',
					text: `${closestMatch.team1.name} ${closestMatch.score1} - ${closestMatch.score2} ${closestMatch.team2.name}`,
					meta: `Scarto di ${Math.abs((closestMatch.score1 ?? 0) - (closestMatch.score2 ?? 0))} punto/i`,
				}
			: null,
		topScorerOfDay
			? {
					key: `top-scorer-day-${topScorerOfDay.day}`,
					icon: '⭐',
					title: 'Top scorer di giornata',
					text: `${topScorerOfDay.playerName} (${topScorerOfDay.teamName})`,
					meta: `${topScorerOfDay.points} punti totali`,
				}
			: null,
		topThreePointLeader
			? {
					key: 'three-point-leader',
					icon: '🎯',
					title: 'Leader 3PT Challenge',
					text: topThreePointLeader.playerName,
					meta: `${topThreePointLeader.score} punti`,
				}
			: null,
	].filter((highlight): highlight is TournamentHighlight => Boolean(highlight))

	return {
		highlights,
		availableDays,
		selectedDay,
	}
}
