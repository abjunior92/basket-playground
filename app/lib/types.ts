import { type Level, type Sizes } from '@prisma/client'

export const playerLevelsMap = new Map<Level, string>([
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

export const playerLevelsTransform: Record<Level, string> = {
	serie_b: 'Serie B',
	serie_c: 'Serie C',
	serie_d: 'Serie D',
	prima_divisione: 'Prima Divisione',
	promozione: 'Promozione',
	u15: 'U15',
	u17: 'U17',
	u19: 'U19',
	u20: 'U20',
	over: 'Over',
	mai_giocato: 'Mai Giocato',
	free_agent: 'Free Agent',
	csi: 'CSI',
	campetto: 'Campetto',
	basket2all: 'Basket2All',
}

export const playerSizesMap = new Map<Sizes, string>([
	['xsmall', 'XSmall'],
	['small', 'Small'],
	['medium', 'Medium'],
	['large', 'Large'],
	['xlarge', 'XLarge'],
	['xxlarge', 'XXLarge'],
	['xxxlarge', 'XXXLarge'],
])

export const playerSizesTransform: Record<Sizes, string> = {
	xsmall: 'XSmall',
	small: 'Small',
	medium: 'Medium',
	large: 'Large',
	xlarge: 'XLarge',
	xxlarge: 'XXLarge',
	xxxlarge: 'XXXLarge',
}

export type PlayerStatsType = {
	id: string
	name: string
	surname: string
	birthYear: number
	team: string
	teamId: string
	paid: boolean
	totalPoints: number
	isExpelled: boolean
	warnings: number
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
	pointsScored: number
	pointsConceded: number
	winPercentage: number
	pointsDifference: number
	pointsGroup: number
}
