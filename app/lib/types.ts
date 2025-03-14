export type PlayerLevels =
	| 'serie_b'
	| 'serie_c'
	| 'serie_d'
	| 'prima_divisione'
	| 'promozione'
	| 'u15'
	| 'u17'
	| 'u19'
	| 'u20'
	| 'over'
	| 'mai_giocato'
	| 'free_agent'
	| 'csi'
	| 'campetto'
	| 'basket2all'

export const playerLevelsMap = new Map<PlayerLevels, string>([
	['serie_b', 'Serie B'],
	['serie_c', 'Serie C'],
	['serie_d', 'Serie D'],
	['prima_divisione', 'Prima Divisione'],
	['promozione', 'Promozione'],
	['u15', 'U15'],
	['u17', 'U17'],
	['u19', 'U19'],
	['u20', 'U20'],
	['over', 'Over'],
	['mai_giocato', 'Mai Giocato'],
	['free_agent', 'Free Agent'],
	['csi', 'CSI'],
	['campetto', 'Campetto'],
	['basket2all', 'Basket2All'],
])

export type PlayerStatsType = {
	id: string
	name: string
	surname: string
	birthYear: number
	team: string
	teamId: string
	paid: boolean
	totalPoints: number
	matches: {
		matchId: string
		opponent: string
		day: number
		timeSlot: string
		points: number
	}[]
}

export type TeamWithStatsType = {
	id: string
	name: string
	matchesPlayed: number
	matchesWon: number
	winPercentage: number
	pointDifference: number
}
