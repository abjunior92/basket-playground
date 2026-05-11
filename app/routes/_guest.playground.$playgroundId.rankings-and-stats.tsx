import { type ColorGroup } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData, useLocation, useParams } from '@remix-run/react'
import { ChevronRight, Medal } from 'lucide-react'
import invariant from 'tiny-invariant'
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
import { groupAccentClasses, getRankingsData, groupBorderClasses } from '~/lib/rankings'
import { colorGroupClasses } from '~/lib/types'
import { cn } from '~/lib/utils'

export const meta: MetaFunction = () => {
	return [
		{ title: 'Classifiche' },
		{ name: 'description', content: 'Classifiche' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	return getRankingsData(params.playgroundId)
}

export default function Rankings() {
	const {
		topPlayersGroups,
		topPlayersFinals,
		groups,
		directPlayoffTeamIds,
		playinTeamIds,
	} = useLoaderData<typeof loader>()
	const params = useParams()
	const location = useLocation()
	const currentPath = `${location.pathname}${location.search}`
	const directPlayoffSet = new Set(directPlayoffTeamIds)
	const playinSet = new Set(playinTeamIds)

	return (
		<div className="p-4">
			<Header
				title="Classifiche"
				backLink={`/playground/${params.playgroundId}/menu`}
				icon={<Medal />}
			/>
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
							<div key={groupName} className="mt-4">
								<div
									className={cn(
										'overflow-hidden rounded-lg border border-gray-300',
										groupBorderClasses[color as ColorGroup],
									)}
								>
									<div
										className={cn(
											'rounded-lg rounded-b-none border px-4 py-3 backdrop-blur-xl',
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
									<Table className="w-full border-collapse">
										<TableHeader>
											<TableRow className="bg-gray-100">
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
														className="text-center backdrop-blur-xl"
													>
														<TableCell className="text-center font-semibold text-slate-700">
															<span
																className={cn(
																	'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold leading-none sm:h-8 sm:min-w-8 sm:px-2 sm:text-sm',
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
														<TableCell>
															<Link
																to={`/playground/${params.playgroundId}/team/${team.id}?returnTo=${encodeURIComponent(currentPath)}`}
																className="guest-link-pill w-[stretch] justify-between"
																aria-label={`Apri profilo squadra ${team.name}`}
															>
																<span>{team.name}</span>
																<ChevronRight className="h-3.5 w-3.5 opacity-80" />
															</Link>
														</TableCell>
														<TableCell>{team.matchesWon}</TableCell>
														<TableCell>
															{team.matchesPlayed - team.matchesWon}
														</TableCell>
														<TableCell>
															{team.winPercentage.toFixed(2)}
														</TableCell>
														<TableCell>{team.pointsScored}</TableCell>
														<TableCell>{team.pointsConceded}</TableCell>
														<TableCell>{team.pointsDifference}</TableCell>
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
					<h3 className="text-lg font-bold">Top 100</h3>
					<div className="mt-4 overflow-hidden rounded-lg border border-gray-300">
						<Table className="w-full border-collapse">
							<TableHeader>
								<TableRow className="bg-gray-100">
									<TableHead>Nome Cognome</TableHead>
									<TableHead>Squadra</TableHead>
									<TableHead>Girone</TableHead>
									<TableHead>Punti gironi</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{topPlayersGroups.map((player) => (
									<TableRow
										key={player.id}
										className={cn('text-center', {
											'bg-red-500/20': player.isExpelled,
											'hover:bg-red-500/30': player.isExpelled,
											'bg-yellow-500/20': player.warnings === 1,
											'hover:bg-yellow-500/30': player.warnings === 1,
										})}
									>
										<TableCell>
											<Link
												to={`/playground/${params.playgroundId}/player/${player.id}?returnTo=${encodeURIComponent(currentPath)}`}
												className="guest-link-pill w-[stretch] justify-between"
												aria-label={`Apri profilo giocatore ${player.name} ${player.surname}`}
											>
												<span>
													{player.name} {player.surname}
												</span>
												<ChevronRight className="h-3.5 w-3.5 opacity-80" />
											</Link>
										</TableCell>
										<TableCell>{player.team.name}</TableCell>
										<TableCell>
											<Badge
												className={colorGroupClasses[player.team.group.color]}
											>
												{player.team.group.name}
											</Badge>
										</TableCell>
										<TableCell>{player.groupPoints}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</TabsContent>

				<TabsContent value="finals">
					<h3 className="text-lg font-bold">Top 50</h3>
					<div className="mt-4 overflow-hidden rounded-lg border border-gray-300">
						<Table className="w-full border-collapse">
							<TableHeader>
								<TableRow className="bg-gray-100">
									<TableHead>Nome Cognome</TableHead>
									<TableHead>Squadra</TableHead>
									<TableHead>Girone</TableHead>
									<TableHead>Punti finals</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{topPlayersFinals.map((player) => (
									<TableRow
										key={player.id}
										className={cn('text-center', {
											'bg-red-500/20': player.isExpelled,
											'hover:bg-red-500/30': player.isExpelled,
											'bg-yellow-500/20': player.warnings === 1,
											'hover:bg-yellow-500/30': player.warnings === 1,
										})}
									>
										<TableCell>
											<Link
												to={`/playground/${params.playgroundId}/player/${player.id}?returnTo=${encodeURIComponent(currentPath)}`}
												className="guest-link-pill w-[stretch] justify-between"
												aria-label={`Apri profilo giocatore ${player.name} ${player.surname}`}
											>
												<span>
													{player.name} {player.surname}
												</span>
												<ChevronRight className="h-3.5 w-3.5 opacity-80" />
											</Link>
										</TableCell>
										<TableCell>{player.team.name}</TableCell>
										<TableCell>
											<Badge
												className={colorGroupClasses[player.team.group.color]}
											>
												{player.team.group.name}
											</Badge>
										</TableCell>
										<TableCell>{player.finalsPoints}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	)
}
