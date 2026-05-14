import { type ColorGroup } from '@prisma/client'
import { Link } from '@remix-run/react'
import { ChevronRight, Medal } from 'lucide-react'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
	type RankingsData,
	groupAccentClasses,
	groupBorderClasses,
} from '~/lib/rankings'
import { colorGroupClasses } from '~/lib/types'
import { cn } from '~/lib/utils'

type RankingsAndStatsProps = {
	data: RankingsData
	playgroundId: string
	backLink: string
	containerClassName?: string
	withLinks?: boolean
	currentPath?: string
}

type RankedPlayer =
	| RankingsData['topPlayersGroups'][number]
	| RankingsData['topPlayersFinals'][number]

const getRankPillClasses = (position: number) => {
	if (position === 1) {
		return 'bg-yellow-400 text-yellow-950 ring-2 ring-yellow-200/80'
	}

	if (position === 2) {
		return 'bg-slate-300 text-slate-950 ring-2 ring-slate-200/80'
	}

	if (position === 3) {
		return 'bg-amber-800 text-amber-50 ring-2 ring-amber-200/80'
	}

	return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100'
}

const getScoreTextClasses = (position: number) => {
	if (position === 1) {
		return 'text-3xl sm:text-4xl bg-radial from-yellow-100 via-yellow-600 to-yellow-500 bg-clip-text text-transparent'
	}

	if (position === 2) {
		return 'text-2xl sm:text-3xl bg-radial from-slate-100 via-slate-600 to-slate-500 bg-clip-text text-transparent'
	}

	if (position === 3) {
		return 'text-xl sm:text-2xl bg-radial from-amber-100 via-amber-600 to-amber-500 bg-clip-text text-transparent'
	}

	return 'text-lg sm:text-xl'
}

type PlayerRankingListProps<T extends RankedPlayer> = {
	title: string
	players: T[]
	withLinks: boolean
	playgroundId: string
	currentPath?: string
	getScore: (player: T) => number
	showGroupBadge?: boolean
}

const PlayerRankingList = <T extends RankedPlayer>({
	title,
	players,
	withLinks,
	playgroundId,
	currentPath,
	getScore,
	showGroupBadge = false,
}: PlayerRankingListProps<T>) => {
	return (
		<div className="mt-4 overflow-hidden rounded-xl border border-amber-300/70 shadow-sm backdrop-blur-xl dark:bg-slate-900">
			<div className="flex items-center justify-between border-b border-amber-300/60 bg-linear-to-r from-amber-400 via-yellow-300 to-amber-200 px-4 py-3 backdrop-blur-xl">
				<h3 className="bg- text-base font-extrabold text-amber-950 sm:text-lg">
					{title}
				</h3>
				<div className="mt-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
					Punti
				</div>
			</div>

			<div className="space-y-1.5 p-2 sm:p-3">
				{players.map((player, index) => {
					const position = index + 1

					return (
						<div
							key={player.id}
							className={cn(
								'flex items-center gap-3 rounded-xl px-2.5 py-3 sm:gap-4 sm:px-3',
								{
									'bg-red-500/15': player.isExpelled,
									'bg-yellow-500/15': player.warnings === 1,
								},
							)}
						>
							<div className="shrink-0">
								<span
									className={cn(
										'inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm leading-none font-bold sm:h-9 sm:min-w-9 sm:text-base',
										getRankPillClasses(position),
									)}
								>
									{position}
								</span>
							</div>

							<div className="min-w-0 flex-1">
								{withLinks ? (
									<Link
										to={`/playground/${playgroundId}/player/${player.id}?returnTo=${encodeURIComponent(currentPath ?? '')}`}
										className="group inline-flex max-w-full items-center gap-2"
										aria-label={`Apri profilo giocatore ${player.name} ${player.surname}`}
									>
										<span className="truncate text-base font-extrabold text-slate-900 sm:text-lg dark:text-slate-100">
											{player.name} {player.surname}
										</span>
										<ChevronRight className="h-4 w-4 shrink-0 opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
									</Link>
								) : (
									<div className="truncate text-base font-extrabold text-slate-900 sm:text-lg dark:text-slate-100">
										{player.name} {player.surname}
									</div>
								)}

								<div className="mt-0.5 flex flex-wrap items-center gap-2">
									<span className="truncate text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">
										{player.team.name}
									</span>

									{showGroupBadge ? (
										<Badge
											className={cn(
												colorGroupClasses[player.team.group.color],
												'text-[10px] sm:text-xs',
											)}
										>
											{player.team.group.name}
										</Badge>
									) : null}
								</div>
							</div>

							<div className="shrink-0 text-right">
								<div
									className={cn(
										'font-mono tabular-nums leading-none font-black text-slate-900 dark:text-slate-100',
										getScoreTextClasses(position),
									)}
								>
									{getScore(player)}
								</div>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}

const RankingsAndStats = ({
	data,
	playgroundId,
	backLink,
	containerClassName = 'p-4',
	withLinks = false,
	currentPath,
}: RankingsAndStatsProps) => {
	const {
		topPlayersGroups,
		topPlayersFinals,
		groups,
		directPlayoffTeamIds,
		playinTeamIds,
	} = data
	const directPlayoffSet = new Set(directPlayoffTeamIds)
	const playinSet = new Set(playinTeamIds)

	return (
		<div className={containerClassName}>
			<Header title="Classifiche" backLink={backLink} icon={<Medal />} />
			<Tabs defaultValue="groups" className="mt-4 w-full">
				<TabsList>
					<TabsTrigger value="groups">Classifica Gironi</TabsTrigger>
					<TabsTrigger value="players">
						Classifica Giocatori - Gironi
					</TabsTrigger>
					<TabsTrigger value="finals">
						Classifica Giocatori - Finals
					</TabsTrigger>
				</TabsList>

				<TabsContent value="groups">
					{Object.entries(groups).map(([groupName, teams]) => {
						const [name, color] = groupName.split('_')
						return (
							<div key={groupName} className="mt-4 backdrop-blur-xl">
								<div
									className={cn(
										'overflow-hidden rounded-lg border border-gray-300',
										groupBorderClasses[color as ColorGroup],
									)}
								>
									<div
										className={cn(
											'rounded-lg rounded-b-none border border-b-0 px-4 py-3',
											groupAccentClasses[color as ColorGroup],
										)}
									>
										<div className="relative flex items-center justify-between gap-3">
											<Badge
												className={cn(
													colorGroupClasses[color as ColorGroup],
													'text-base',
												)}
											>
												{name}
											</Badge>
											<div className="flex flex-wrap items-center gap-2 text-xs font-medium">
												<span className="rounded-md bg-emerald-500/50 px-2 py-1 text-emerald-950 dark:text-emerald-200">
													Playoff
												</span>
												<span className="rounded-md bg-amber-500/50 px-2 py-1 text-amber-950 dark:text-amber-200">
													Play-in
												</span>
											</div>
										</div>
									</div>
									<Table className="w-full border-collapse backdrop-blur-xl **:border-none">
										<TableHeader>
											<TableRow
												className={cn(
													'border-none backdrop-blur-xl',
													groupAccentClasses[color as ColorGroup],
												)}
											>
												<TableHead>#</TableHead>
												<TableHead>Squadra</TableHead>
												<TableHead>V</TableHead>
												<TableHead>P</TableHead>
												<TableHead>%</TableHead>
												<TableHead>PF</TableHead>
												<TableHead>PS</TableHead>
												<TableHead>+/-</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{teams.map((team, index) => {
												const isDirectPlayoff = directPlayoffSet.has(team.id)
												const isPlayin = playinSet.has(team.id)
												return (
													<TableRow
														key={team.id}
														className="bg-transparent text-center"
													>
														<TableCell className="text-center font-semibold text-slate-700">
															<span
																className={cn(
																	'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs leading-none font-bold sm:h-8 sm:min-w-8 sm:px-2 sm:text-sm',
																	{
																		'bg-emerald-500 text-white ring-2 ring-emerald-300/70':
																			isDirectPlayoff,
																		'bg-amber-500 text-amber-950 ring-2 ring-amber-300/70':
																			!isDirectPlayoff && isPlayin,
																		'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100':
																			!isDirectPlayoff && !isPlayin,
																	},
																)}
															>
																{index + 1}
															</span>
														</TableCell>
														<TableCell align="left">
															{withLinks ? (
																<Link
																	to={`/playground/${playgroundId}/team/${team.id}?returnTo=${encodeURIComponent(currentPath ?? '')}`}
																	className="guest-link-pill w-[stretch] justify-between font-bold"
																	aria-label={`Apri profilo squadra ${team.name}`}
																>
																	<span>{team.name}</span>
																	<ChevronRight className="h-3.5 w-3.5 opacity-80" />
																</Link>
															) : (
																<span className="font-bold">{team.name}</span>
															)}
														</TableCell>
														<TableCell className="font-mono tabular-nums">
															{team.matchesWon}
														</TableCell>
														<TableCell className="font-mono tabular-nums">
															{team.matchesPlayed - team.matchesWon}
														</TableCell>
														<TableCell className="font-mono tabular-nums">
															{team.winPercentage.toFixed(2)}
														</TableCell>
														<TableCell className="font-mono tabular-nums">
															{team.pointsScored}
														</TableCell>
														<TableCell className="font-mono tabular-nums">
															{team.pointsConceded}
														</TableCell>
														<TableCell className="font-mono tabular-nums">
															{team.pointsDifference}
														</TableCell>
													</TableRow>
												)
											})}
										</TableBody>
									</Table>
								</div>
							</div>
						)
					})}
				</TabsContent>

				<TabsContent value="players">
					<PlayerRankingList
						title="Top 100"
						players={topPlayersGroups}
						withLinks={withLinks}
						playgroundId={playgroundId}
						currentPath={currentPath}
						getScore={(player) => player.groupPoints}
						showGroupBadge
					/>
				</TabsContent>

				<TabsContent value="finals">
					<PlayerRankingList
						title="Top 50"
						players={topPlayersFinals}
						withLinks={withLinks}
						playgroundId={playgroundId}
						currentPath={currentPath}
						getScore={(player) => player.finalsPoints}
					/>
				</TabsContent>
			</Tabs>
		</div>
	)
}

export default RankingsAndStats
