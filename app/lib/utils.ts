import { type Match } from '@prisma/client'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
	type TeamWithPlayoffStats,
	type TeamWithMatches,
	type TeamWithStatsType,
} from '~/lib/types'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export const getTimeSlots = () => {
	const timeSlots = []
	let hour = 18
	let minute = 0

	while (hour < 22 || (hour === 22 && minute <= 55)) {
		const start = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

		// Aggiungi 15 minuti per ottenere l'orario di fine
		minute += 15
		if (minute >= 60) {
			minute = 0
			hour++
		}

		const end = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

		timeSlots.push(`${start} > ${end}`)

		// Aggiungi la pausa di 5 minuti
		minute += 5
		if (minute >= 60) {
			minute = 0
			hour++
		}
	}

	return timeSlots
}

export const getDayLabel = (day: string) => {
	let label

	switch (day) {
		case '1':
			label = 'Domenica'
			break
		case '2':
			label = 'Lunedì'
			break
		case '3':
			label = 'Martedì'
			break
		case '4':
			label = 'Mercoledì'
			break
		case '5':
			label = 'Giovedì (Play-in)'
			break
		case '6':
			label = 'Venerdì (Recuperi)'
			break
		case '7':
			label = 'Domenica (Finali)'
			break
		default:
			break
	}
	return label
}

export const getFinalTimeSlots = () => {
	return getTimeSlots().filter(
		(slot) =>
			isMatchFinalEight(slot) ||
			isMatchFinalFour(slot) ||
			isMatchSemifinal(slot) ||
			isMatchThirdPlace(slot) ||
			isMatchFinal(slot),
	)
}

export const getMatchLabel = (timeSlot: string) => {
	let label

	switch (timeSlot) {
		case '19:20 > 19:35':
		case '19:40 > 19:55':
		case '20:00 > 20:15':
		case '20:20 > 20:35':
			label = 'Ottavi di Finale'
			break
		case '20:40 > 20:55':
		case '21:00 > 21:15':
			label = 'Quarti di Finale'
			break
		case '21:20 > 21:35':
			label = 'Semifinali'
			break
		case '21:40 > 21:55':
			label = 'Terzo posto'
			break
		case '22:00 > 22:15':
			label = 'Finale'
			break
		default:
			label = 'Extra Partita'
			break
	}
	return label
}

export const isMatchFinalEight = (match: Match | string) => {
	if (typeof match === 'string') {
		match = { timeSlot: match } as Match
	}
	return (
		match.timeSlot === '19:20 > 19:35' ||
		match.timeSlot === '19:40 > 19:55' ||
		match.timeSlot === '20:00 > 20:15' ||
		match.timeSlot === '20:20 > 20:35'
	)
}
export const isMatchFinalFour = (match: Match | string) => {
	if (typeof match === 'string') {
		match = { timeSlot: match } as Match
	}
	return (
		match.timeSlot === '20:40 > 20:55' || match.timeSlot === '21:00 > 21:15'
	)
}

export const isMatchSemifinal = (match: Match | string) => {
	if (typeof match === 'string') {
		match = { timeSlot: match } as Match
	}
	return match.timeSlot === '21:20 > 21:35'
}

export const isMatchThirdPlace = (match: Match | string) => {
	if (typeof match === 'string') {
		match = { timeSlot: match } as Match
	}
	return match.timeSlot === '21:40 > 21:55'
}

export const isMatchFinal = (match: Match | string) => {
	if (typeof match === 'string') {
		match = { timeSlot: match } as Match
	}
	return match.timeSlot === '22:00 > 22:15'
}

// Funzione per calcolare gli scontri diretti tra due squadre
const getHeadToHeadResult = (
	team1Id: string,
	team2Id: string,
	teams: TeamWithMatches[],
) => {
	// Cerca la partita dove team1 ha giocato come team1 contro team2
	const team1 = teams.find((t) => t.id === team1Id)
	const team2 = teams.find((t) => t.id === team2Id)

	if (!team1 || !team2) return null

	// Cerca nelle partite di team1 come team1
	const matchAsTeam1 = team1.matchesAsTeam1.find((m) => {
		// Trova la partita corrispondente in team2 come team2
		return team2.matchesAsTeam2.some(
			(m2) => m2.id === m.id && m.winner !== null,
		)
	})

	// Cerca nelle partite di team1 come team2
	const matchAsTeam2 = team1.matchesAsTeam2.find((m) => {
		// Trova la partita corrispondente in team2 come team1
		return team2.matchesAsTeam1.some(
			(m2) => m2.id === m.id && m.winner !== null,
		)
	})

	const match = matchAsTeam1 || matchAsTeam2
	if (!match) return null

	return match.winner === team1Id ? 1 : -1 // 1 se vince team1, -1 se vince team2
}

// Funzione per calcolare la classifica avulsa tra squadre pari
export const calculateTiebreaker = (
	teams: TeamWithStatsType[] | TeamWithPlayoffStats[],
	teamsWithMatches: TeamWithMatches[],
) => {
	if (teams.length <= 1) return teams

	// Calcola punti per scontri diretti
	const teamsWithHeadToHead = teams.map((team) => ({
		...team,
		headToHeadPoints: 0,
		headToHeadGames: 0,
	}))

	// Calcola scontri diretti tra tutte le squadre
	for (let i = 0; i < teamsWithHeadToHead.length; i++) {
		for (let j = i + 1; j < teamsWithHeadToHead.length; j++) {
			const result = getHeadToHeadResult(
				teamsWithHeadToHead[i]?.id || '',
				teamsWithHeadToHead[j]?.id || '',
				teamsWithMatches,
			)
			if (result !== null) {
				if (teamsWithHeadToHead[i]) {
					teamsWithHeadToHead[i]!.headToHeadGames++
				}
				if (teamsWithHeadToHead[j]) {
					teamsWithHeadToHead[j]!.headToHeadGames++
				}
				if (result === 1) {
					if (teamsWithHeadToHead[i])
						teamsWithHeadToHead[i]!.headToHeadPoints += 2
				} else {
					if (teamsWithHeadToHead[j])
						teamsWithHeadToHead[j]!.headToHeadPoints += 2
				}
			}
		}
	}

	// Ordina per punti scontri diretti, poi per differenza canestri
	return teamsWithHeadToHead.sort((a, b) => {
		if (!a || !b) return 0
		if (b.headToHeadPoints !== a.headToHeadPoints) {
			return (b.headToHeadPoints || 0) - (a.headToHeadPoints || 0)
		}
		return b.pointsDifference - a.pointsDifference
	})
}

// Funzione per ordinare squadre con la nuova logica (scontri diretti)
export const sortTeamsWithTiebreaker = (
	placedTeams: (TeamWithPlayoffStats | null | undefined)[],
	teams: TeamWithMatches[],
) => {
	const validTeams =
		placedTeams.filter(
			(team): team is TeamWithPlayoffStats =>
				team !== null && team !== undefined,
		) ?? []

	// Prima ordina per percentuale vittorie
	validTeams.sort((a, b) => b.winPercentage - a.winPercentage)

	// Poi applica la classifica avulsa per squadre con stessa percentuale
	let currentIndex = 0
	while (currentIndex < validTeams.length) {
		const currentWinPercentage = validTeams[currentIndex]!.winPercentage
		let endIndex = currentIndex + 1

		// Trova tutte le squadre con la stessa percentuale vittorie
		while (
			endIndex < validTeams.length &&
			validTeams[endIndex]!.winPercentage === currentWinPercentage
		) {
			endIndex++
		}

		// Se ci sono più squadre con la stessa percentuale, applica la classifica avulsa
		if (endIndex - currentIndex > 1) {
			const tiedTeams = validTeams.slice(currentIndex, endIndex)
			const sortedTiedTeams = calculateTiebreaker(tiedTeams, teams)

			// Sostituisci le squadre ordinate
			for (let i = 0; i < sortedTiedTeams.length; i++) {
				validTeams[currentIndex + i] = sortedTiedTeams[
					i
				]! as TeamWithPlayoffStats
			}
		}

		currentIndex = endIndex
	}

	return validTeams
}
