import { type TournamentFormat } from '@prisma/client'
import { type TeamWithPlayoffStats } from '~/lib/types'

export const PLAYIN_WINNERS_COUNT = 8
export const PLAYOFF_FINALISTS_COUNT = 16

export const DEFAULT_TOURNAMENT_FORMAT: TournamentFormat = 'five_groups'

const TOURNAMENT_FORMATS = [
	'four_groups',
	'four_groups_six',
	'five_groups',
] as const satisfies readonly TournamentFormat[]

export const isTournamentFormat = (
	value: string,
): value is TournamentFormat => {
	return (TOURNAMENT_FORMATS as readonly string[]).includes(value)
}

export const usesFourGroupQualification = (
	format: TournamentFormat,
): boolean => {
	return format === 'four_groups' || format === 'four_groups_six'
}

export const resolveTournamentFormat = (
	format: TournamentFormat | null | undefined,
): TournamentFormat => {
	if (format && isTournamentFormat(format)) {
		return format
	}
	return DEFAULT_TOURNAMENT_FORMAT
}

export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
	four_groups: '4 gironi · 28 squadre',
	four_groups_six: '4 gironi · 24 squadre',
	five_groups: '5 gironi · 32 squadre',
}

export const TOURNAMENT_FORMAT_DESCRIPTIONS: Record<TournamentFormat, string> =
	{
		four_groups:
			'4 gironi da 7 squadre. Playoff diretti: 1ª e 2ª di ogni girone. Play-in: 3ª, 4ª, 5ª e 6ª.',
		four_groups_six:
			'4 gironi da 6 squadre. Playoff diretti: 1ª e 2ª di ogni girone. Play-in: 3ª, 4ª, 5ª e 6ª.',
		five_groups:
			'5 gironi da 6–7 squadre. Playoff diretti: tutte le 1ª e le 3 migliori 2ª. Play-in: le 2 peggiori 2ª, tutte le 3ª e 4ª e le 4 migliori 5ª.',
	}

export const TOURNAMENT_FORMAT_LIMITS: Record<
	TournamentFormat,
	{ maxGroups: number; teamsPerGroup: number | { max: number } }
> = {
	four_groups: { maxGroups: 4, teamsPerGroup: 7 },
	four_groups_six: { maxGroups: 4, teamsPerGroup: 6 },
	five_groups: { maxGroups: 5, teamsPerGroup: { max: 7 } },
}

export const getFormatTeamsPerGroupHint = (
	format: TournamentFormat,
): string => {
	if (format === 'four_groups') {
		return 'Ogni girone deve avere esattamente 7 squadre.'
	}
	if (format === 'four_groups_six') {
		return 'Ogni girone deve avere esattamente 6 squadre.'
	}
	return 'Ogni girone può avere 6 o 7 squadre.'
}

export type PlacedTeams = {
	first: TeamWithPlayoffStats[]
	second: TeamWithPlayoffStats[]
	third: TeamWithPlayoffStats[]
	fourth: TeamWithPlayoffStats[]
	fifth: TeamWithPlayoffStats[]
	sixth: TeamWithPlayoffStats[]
}

export type QualificationSummaryItem = {
	label: string
	count: number
}

export const computePlayoffQualification = (
	format: TournamentFormat | null | undefined,
	placed: PlacedTeams,
): {
	directPlayoffTeams: TeamWithPlayoffStats[]
	playinTeams: TeamWithPlayoffStats[]
} => {
	const resolvedFormat = resolveTournamentFormat(format)

	if (usesFourGroupQualification(resolvedFormat)) {
		return {
			directPlayoffTeams: [...placed.first, ...placed.second],
			playinTeams: [
				...placed.third,
				...placed.fourth,
				...placed.fifth,
				...placed.sixth,
			],
		}
	}

	return {
		directPlayoffTeams: [...placed.first, ...placed.second.slice(0, 3)],
		playinTeams: [
			...placed.second.slice(3),
			...placed.third,
			...placed.fourth,
			...placed.fifth.slice(0, 4),
		],
	}
}

export const getDirectPlayoffDistributionSummary = (
	format: TournamentFormat | null | undefined,
	placed: PlacedTeams,
): QualificationSummaryItem[] => {
	const resolvedFormat = resolveTournamentFormat(format)

	if (usesFourGroupQualification(resolvedFormat)) {
		return [
			{ label: '1ª classificate', count: placed.first.length },
			{ label: '2ª classificate', count: placed.second.length },
		]
	}

	return [
		{ label: '1ª classificate', count: placed.first.length },
		{
			label: '2ª classificate (migliori 3)',
			count: Math.min(3, placed.second.length),
		},
	]
}

export const getPlayinDistributionSummary = (
	format: TournamentFormat | null | undefined,
	placed: PlacedTeams,
): QualificationSummaryItem[] => {
	const resolvedFormat = resolveTournamentFormat(format)

	if (usesFourGroupQualification(resolvedFormat)) {
		return [
			{ label: '3ª classificate', count: placed.third.length },
			{ label: '4ª classificate', count: placed.fourth.length },
			{ label: '5ª classificate', count: placed.fifth.length },
			{ label: '6ª classificate', count: placed.sixth.length },
		]
	}

	return [
		{
			label: '2ª classificate (peggiori)',
			count: Math.max(0, placed.second.length - 3),
		},
		{ label: '3ª classificate', count: placed.third.length },
		{ label: '4ª classificate', count: placed.fourth.length },
		{
			label: '5ª classificate (migliori 4)',
			count: Math.min(4, placed.fifth.length),
		},
	]
}

export const getFormatRulesSections = (
	format: TournamentFormat | null | undefined,
): { groups: string; directPlayoff: string; playin: string } => {
	const resolvedFormat = resolveTournamentFormat(format)

	if (resolvedFormat === 'four_groups') {
		return {
			groups:
				'Il torneo prevede 4 gironi da 7 squadre ciascuno (28 squadre totali).',
			directPlayoff:
				'Accedono direttamente ai playoff: tutte le prime e tutte le seconde classificate di ogni girone.',
			playin:
				'Ai playin accedono: tutte le terze, quarte, quinte e seste classificate di ogni girone. Le settimes sono eliminate.',
		}
	}

	if (resolvedFormat === 'four_groups_six') {
		return {
			groups:
				'Il torneo prevede 4 gironi da 6 squadre ciascuno (24 squadre totali).',
			directPlayoff:
				'Accedono direttamente ai playoff: tutte le prime e tutte le seconde classificate di ogni girone.',
			playin:
				'Ai playin accedono: tutte le terze, quarte, quinte e seste classificate di ogni girone.',
		}
	}

	return {
		groups: 'Il torneo prevede 5 gironi (alcuni da 7 squadre, altri da 6).',
		directPlayoff:
			'Accedono direttamente ai playoff: tutte le prime classificate e le 3 migliori seconde.',
		playin:
			'Ai playin accedono: 2 peggiori seconde, tutte le terze, tutte le quarte e le 4 migliori quinte.',
	}
}

export const getTeamsPerGroupLimit = (
	format: TournamentFormat | null | undefined,
): number | null => {
	const limit =
		TOURNAMENT_FORMAT_LIMITS[resolveTournamentFormat(format)].teamsPerGroup
	return typeof limit === 'number' ? limit : limit.max
}

export const canAddTeamToGroup = (
	format: TournamentFormat | null | undefined,
	currentTeamCount: number,
): boolean => {
	const limit = getTeamsPerGroupLimit(format)
	if (limit === null) return true
	return currentTeamCount < limit
}

export const canAddGroupToPlayground = (
	format: TournamentFormat | null | undefined,
	currentGroupCount: number,
): boolean => {
	return (
		currentGroupCount <
		TOURNAMENT_FORMAT_LIMITS[resolveTournamentFormat(format)].maxGroups
	)
}
