import { type ColorGroup, type Level, type Sizes } from '@prisma/client'

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

export const colorGroupMap = new Map<ColorGroup, string>([
	['red', 'Red'],
	['blue', 'Blue'],
	['green', 'Green'],
	['light_green', 'Light Green'],
	['yellow', 'Yellow'],
	['purple', 'Purple'],
	['orange', 'Orange'],
	['pink', 'Pink'],
	['gray', 'Gray'],
	['black', 'Black'],
	['white', 'White'],
	['brown', 'Brown'],
	['cyan', 'Cyan'],
])

export const colorGroupTransform: Record<ColorGroup, string> = {
	red: 'Rosso',
	blue: 'Blu',
	green: 'Verde',
	light_green: 'Verde chiaro',
	yellow: 'Giallo',
	purple: 'Viola',
	orange: 'Arancione',
	pink: 'Rosa',
	gray: 'Grigio',
	black: 'Nero',
	white: 'Bianco',
	brown: 'Marrone',
	cyan: 'Azzurro',
}

export const colorGroupClasses: Record<ColorGroup, string> = {
	red: 'bg-red-500',
	blue: 'bg-blue-500',
	green: 'bg-green-600',
	light_green: 'bg-green-300',
	yellow: 'bg-yellow-500',
	purple: 'bg-purple-500',
	orange: 'bg-orange-500',
	pink: 'bg-pink-500',
	gray: 'bg-gray-500',
	black: 'bg-black',
	white: 'bg-white',
	brown: 'bg-yellow-950',
	cyan: 'bg-cyan-300',
}

export type PlayerStatsType = {
	id: string
	name: string
	surname: string
	birthYear: number
	team: string
	teamId: string
	paid: boolean
	size: Sizes | null
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
