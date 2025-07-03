import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData, useParams } from '@remix-run/react'
import { Trophy, Users, Calendar, Pencil, Plus } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { colorGroupClasses, type TeamWithPlayoffStats } from '~/lib/types'
import {
	calculateTiebreaker,
	cn,
	getMatchLabel,
	isMatchFinal,
	isMatchFinalEight,
	isMatchFinalFour,
	isMatchSemifinal,
	isMatchThirdPlace,
	sortTeamsWithTiebreaker,
} from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Playoff' },
		{ name: 'description', content: 'Tabellone playoff' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')

	const teams = await prisma.team.findMany({
		where: { group: { playgroundId: params.playgroundId } },
		include: {
			group: true,
			matchesAsTeam1: {
				where: { day: { in: [1, 2, 3, 4, 6] } }, // Solo partite della fase a gironi
				select: { id: true, winner: true, score1: true, score2: true },
			},
			matchesAsTeam2: {
				where: { day: { in: [1, 2, 3, 4, 6] } }, // Solo partite della fase a gironi
				select: { id: true, winner: true, score1: true, score2: true },
			},
		},
	})

	// Calcola le statistiche per ogni squadra
	const teamsWithStats = teams.map((team) => {
		const matches = [...team.matchesAsTeam1, ...team.matchesAsTeam2]
		const matchesPlayed = matches.filter(
			(match) => match.winner !== null,
		).length
		const matchesWon = matches.filter(
			(match) => match.winner === team.id,
		).length

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
			groupPosition: 0, // Sarà aggiornato dopo l'ordinamento
		} as TeamWithPlayoffStats
	})

	// Raggruppa le squadre per girone
	const groups = teamsWithStats.reduce(
		(acc, team) => {
			const groupKey = `${team.group.name}_${team.group.color}`
			if (!acc[groupKey]) {
				acc[groupKey] = []
			}
			acc[groupKey].push(team)
			return acc
		},
		{} as Record<string, TeamWithPlayoffStats[]>,
	)

	// Ordina le squadre di ogni girone con la nuova logica:
	// 1. Ordina per percentuale vittorie
	// 2. Se ci sono squadre con la stessa percentuale vittorie, applica la classifica avulsa
	Object.keys(groups).forEach((groupName) => {
		const group = groups[groupName]
		if (group) {
			// Prima ordina per percentuale vittorie
			group.sort((a, b) => {
				if (!a || !b) return 0
				return b.winPercentage - a.winPercentage
			})

			// Poi applica la classifica avulsa per squadre con stessa percentuale
			let currentIndex = 0
			while (currentIndex < group.length) {
				const currentTeam = group[currentIndex]
				if (!currentTeam) {
					currentIndex++
					continue
				}

				const currentWinPercentage = currentTeam.winPercentage
				let endIndex = currentIndex + 1

				// Trova tutte le squadre con la stessa percentuale vittorie
				while (
					endIndex < group.length &&
					group[endIndex]?.winPercentage === currentWinPercentage
				) {
					endIndex++
				}

				// Se ci sono più squadre con la stessa percentuale, applica la classifica avulsa
				if (endIndex - currentIndex > 1) {
					const tiedTeams = group.slice(currentIndex, endIndex).filter(Boolean)
					const sortedTiedTeams = calculateTiebreaker(tiedTeams, teams)

					// Sostituisci le squadre ordinate
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

			// Aggiungi la posizione in classifica per ogni squadra
			group.forEach((team, index) => {
				if (team) {
					team.groupPosition = index + 1
				}
			})
		}
	})

	// Determina le squadre qualificate per i playoff
	const firstPlacedTeams = Object.values(groups)
		.map((group) => group?.[0])
		.filter(Boolean)
	const secondPlacedTeams = Object.values(groups)
		.map((group) => group?.[1])
		.filter(Boolean)
	const thirdPlacedTeams = Object.values(groups)
		.map((group) => group?.[2])
		.filter(Boolean)
	const fourthPlacedTeams = Object.values(groups)
		.map((group) => group?.[3])
		.filter(Boolean)
	const fifthPlacedTeams = Object.values(groups)
		.map((group) => group?.[4])
		.filter(Boolean)

	// Ordina tutte le classifiche con la nuova logica
	const sortedFirstPlacedTeams = sortTeamsWithTiebreaker(
		firstPlacedTeams,
		teams,
	)
	const sortedSecondPlacedTeams = sortTeamsWithTiebreaker(
		secondPlacedTeams,
		teams,
	)
	const sortedThirdPlacedTeams = sortTeamsWithTiebreaker(
		thirdPlacedTeams,
		teams,
	)
	const sortedFourthPlacedTeams = sortTeamsWithTiebreaker(
		fourthPlacedTeams,
		teams,
	)
	const sortedFifthPlacedTeams = sortTeamsWithTiebreaker(
		fifthPlacedTeams,
		teams,
	)

	// Squadre che vanno direttamente ai playoff (finali di domenica)
	const directPlayoffTeams = [
		...sortedFirstPlacedTeams,
		...sortedSecondPlacedTeams.slice(0, 3), // Le 3 migliori seconde
	].filter(
		(team): team is NonNullable<typeof team> =>
			team !== null && team !== undefined,
	)

	// Squadre che giocano i playin (giovedì)
	const playinTeams = [
		...sortedSecondPlacedTeams.slice(3), // Le 2 peggiori seconde
		...sortedThirdPlacedTeams,
		...sortedFourthPlacedTeams,
		...sortedFifthPlacedTeams.slice(0, 4), // Le 4 migliori quinte
	].filter(
		(team): team is NonNullable<typeof team> =>
			team !== null && team !== undefined,
	)

	// Recupera le partite play-in esistenti
	const playinMatches = await prisma.match.findMany({
		where: {
			playgroundId: params.playgroundId,
			day: 5, // Giovedì
			OR: [
				{
					team1: {
						id: { in: playinTeams.filter((t) => t?.id).map((t) => t!.id) },
					},
				},
				{
					team2: {
						id: { in: playinTeams.filter((t) => t?.id).map((t) => t!.id) },
					},
				},
			],
		},
		include: {
			team1: { include: { group: true } },
			team2: { include: { group: true } },
		},
		orderBy: [{ timeSlot: 'asc' }, { field: 'asc' }],
	})

	// Recupera le squadre vincitrici dei play-in
	const playinWinners = playinMatches
		.filter((match) => match.winner !== null)
		.map((match) => {
			const winningTeam =
				match.winner === match.team1Id ? match.team1 : match.team2

			// Trova la posizione della squadra vincitrice nel suo girone
			const teamGroupKey = `${winningTeam.group.name}_${winningTeam.group.color}`
			const teamInGroup = groups[teamGroupKey]?.find(
				(team) => team.id === winningTeam.id,
			)
			const groupPosition = teamInGroup?.groupPosition || 0

			return {
				id: winningTeam.id,
				name: winningTeam.name,
				group: winningTeam.group,
				// Aggiungi statistiche base per compatibilità
				matchesPlayed: 0,
				matchesWon: 0,
				pointsScored: 0,
				pointsConceded: 0,
				winPercentage: 0,
				pointsDifference: 0,
				pointsGroup: 0,
				groupPosition,
			}
		})

	// Recupera le partite del tabellone playoff (giorno 7 - domenica)
	const playoffMatches = await prisma.match.findMany({
		where: {
			playgroundId: params.playgroundId,
			day: 7, // Domenica - finali
		},
		include: {
			team1: { include: { group: true } },
			team2: { include: { group: true } },
		},
		orderBy: [{ timeSlot: 'asc' }, { field: 'asc' }],
	})

	return {
		directPlayoffTeams: directPlayoffTeams.filter(Boolean),
		playinTeams: playinTeams.filter(Boolean),
		playinMatches,
		playinWinners,
		playoffMatches,
		firstPlacedTeams: sortedFirstPlacedTeams,
		secondPlacedTeams: sortedSecondPlacedTeams,
		thirdPlacedTeams: sortedThirdPlacedTeams,
		fourthPlacedTeams: sortedFourthPlacedTeams,
		fifthPlacedTeams: sortedFifthPlacedTeams,
	}
}

export default function Playoff() {
	const {
		directPlayoffTeams,
		playinTeams,
		playinMatches,
		playinWinners,
		playoffMatches,
		firstPlacedTeams,
		secondPlacedTeams,
		thirdPlacedTeams,
		fourthPlacedTeams,
		fifthPlacedTeams,
	} = useLoaderData<typeof loader>()
	const params = useParams()

	const finalEightMatches = playoffMatches.filter((m) => isMatchFinalEight(m))
	const emptySlotsFinalEight = 8 - finalEightMatches.length
	const finalFourMatches = playoffMatches.filter((m) => isMatchFinalFour(m))
	const emptySlotsFinalFour = 4 - finalFourMatches.length
	const finalTwoMatches = playoffMatches.filter((m) => isMatchSemifinal(m))
	const emptySlotsFinalTwo = 2 - finalTwoMatches.length
	const finalThreeMatches = playoffMatches.filter((m) => isMatchThirdPlace(m))
	const emptySlotsFinalThree = 1 - finalThreeMatches.length
	const finalMatch = playoffMatches.filter((m) => isMatchFinal(m))
	const emptySlotsFinal = 1 - finalMatch.length

	return (
		<div className="md:p-4">
			<Header
				title="Playoff"
				backLink={`/playground/${params.playgroundId}`}
				icon={<Trophy />}
			/>

			<Tabs defaultValue="overview" className="mt-4 w-full">
				<TabsList>
					<TabsTrigger value="overview">Panoramica</TabsTrigger>
					<TabsTrigger value="playin">Play-in (Giovedì)</TabsTrigger>
					<TabsTrigger value="playoff">Playoff (Domenica)</TabsTrigger>
					<TabsTrigger value="bracket">Tabellone</TabsTrigger>
				</TabsList>

				<TabsContent value="overview">
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Squadre Playoff Dirette
								</CardTitle>
								<Trophy className="h-4 w-4 text-yellow-500" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{directPlayoffTeams.length}
								</div>
								<p className="text-muted-foreground text-xs">
									Qualificate direttamente per domenica
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Squadre Play-in
								</CardTitle>
								<Users className="h-4 w-4 text-blue-500" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{playinTeams.length}</div>
								<p className="text-muted-foreground text-xs">
									Giocheranno giovedì per qualificarsi
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Totale Playoff
								</CardTitle>
								<Calendar className="h-4 w-4 text-green-500" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{directPlayoffTeams.length + 8}
								</div>
								<p className="text-muted-foreground text-xs">
									Squadre totali nella fase finale
								</p>
							</CardContent>
						</Card>
					</div>

					<div className="mt-6 grid gap-4 md:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Trophy className="h-5 w-5 text-yellow-500" />
									Squadre Qualificate Direttamente
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{directPlayoffTeams.map((team) => (
										<div
											key={team?.id}
											className="flex items-center justify-between rounded-lg border pr-2"
										>
											<div className="flex items-center gap-2">
												<span className="flex w-6 items-center self-stretch rounded-l-lg border-r px-1">
													{team?.groupPosition}ª
												</span>
												<div className="flex items-center gap-2 p-2">
													<Badge
														className={colorGroupClasses[team?.group?.color]}
													>
														{team?.group?.name}
													</Badge>
													<span className="text-sm font-medium md:text-base">
														{team?.name}
													</span>
												</div>
											</div>
											<div className="text-muted-foreground text-sm">
												{team?.winPercentage.toFixed(2)}%
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Users className="h-5 w-5 text-blue-500" />
									Squadre Play-in
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{playinTeams.map((team) => (
										<div
											key={team?.id}
											className="flex items-center justify-between rounded-lg border pr-2"
										>
											<div className="flex items-center gap-2">
												<span className="flex w-6 items-center self-stretch rounded-l-lg border-r px-1">
													{team?.groupPosition}ª
												</span>
												<div className="flex items-center gap-2 p-2">
													<Badge
														className={colorGroupClasses[team?.group?.color]}
													>
														{team?.group?.name}
													</Badge>
													<span className="text-sm font-medium md:text-base">
														{team?.name}
													</span>
												</div>
											</div>
											<div className="text-muted-foreground text-sm">
												{team?.winPercentage.toFixed(2)}%
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="playin">
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Calendar className="h-5 w-5" />
									Play-in Tournament - Giovedì
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground mb-4 text-sm">
									16 squadre si sfideranno in partite ad eliminazione diretta.
									Le 8 vincitrici accederanno ai playoff di domenica.
								</p>

								<div className="grid gap-4 md:grid-cols-2">
									<div>
										<h4 className="mb-2 font-semibold">
											Squadre Partecipanti:
										</h4>
										<div className="space-y-1">
											{playinTeams.map((team, index) => (
												<div
													key={team?.id}
													className="flex items-center justify-between text-sm"
												>
													<div className="flex items-center gap-2">
														<span>
															{index + 1}. {team?.name}
														</span>
														<span className="text-muted-foreground text-xs">
															{team?.groupPosition}ª pos.
														</span>
													</div>
													<Badge
														className={colorGroupClasses[team?.group?.color]}
													>
														{team?.group?.name}
													</Badge>
												</div>
											))}
										</div>
									</div>

									<div>
										<h4 className="mb-2 font-semibold">
											Distribuzione per Posizione:
										</h4>
										<div className="space-y-1 text-sm">
											<div>
												• 2ª classificate: {secondPlacedTeams.slice(3).length}{' '}
												squadre
											</div>
											<div>
												• 3ª classificate: {thirdPlacedTeams.length} squadre
											</div>
											<div>
												• 4ª classificate: {fourthPlacedTeams.length} squadre
											</div>
											<div>
												• 5ª classificate: {fifthPlacedTeams.slice(0, 4).length}{' '}
												squadre
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Sezione Accoppiamenti Play-in */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center justify-between">
									<span>Accoppiamenti Play-in</span>

									<Button asChild>
										<Link
											to={`/playground/${params.playgroundId}/playoff/new-playin-match`}
										>
											<Plus className="h-5 w-5" />
											<span className="hidden md:block">Aggiungi Partita</span>
										</Link>
									</Button>
								</CardTitle>
							</CardHeader>
							<CardContent>
								{playinMatches.length === 0 ? (
									<div className="text-muted-foreground py-8 text-center">
										<p>Nessuna partita play-in creata ancora.</p>
										<p className="mt-2 text-sm">
											Crea le partite per iniziare il torneo play-in.
										</p>
									</div>
								) : (
									<div className="space-y-4">
										{playinMatches.map((match) => {
											const isTeam1Winner = match.winner === match.team1Id
											const isTeam2Winner = match.winner === match.team2Id
											return (
												<div
													key={match.id}
													className="rounded-lg border p-3 md:p-4"
												>
													{/* Header con orario e campo */}
													<div className="text-muted-foreground mb-3 flex items-center justify-between text-sm">
														<span>
															{match.timeSlot} - Campo {match.field}
														</span>
														<Button
															variant="outline"
															size="sm"
															asChild
															className="md:hidden"
														>
															<Link
																to={`/playground/${params.playgroundId}/matches/${match.id}/edit`}
																state={{
																	backLink: `/playground/${params.playgroundId}/playoff`,
																}}
															>
																<Pencil className="h-4 w-4" />
															</Link>
														</Button>
													</div>

													{/* Layout desktop */}
													<div className="hidden md:flex md:items-center md:justify-between">
														<div className="flex items-center gap-4">
															<div className="flex items-center gap-2">
																<Badge
																	className={
																		colorGroupClasses[match.team1.group.color]
																	}
																>
																	{match.team1.group.name}
																</Badge>
																<span className="font-medium">
																	{isTeam1Winner && '🏆 '}
																	{match.team1.name}
																</span>
															</div>
															<div className="text-muted-foreground">vs</div>
															<div className="flex items-center gap-2">
																<Badge
																	className={
																		colorGroupClasses[match.team2.group.color]
																	}
																>
																	{match.team2.group.name}
																</Badge>
																<span className="font-medium">
																	{isTeam2Winner && '🏆 '}
																	{match.team2.name}
																</span>
															</div>
														</div>
														<div className="flex items-center gap-2">
															{match.score1 !== null &&
															match.score2 !== null ? (
																<div className="text-lg">
																	<span
																		className={cn(
																			isTeam1Winner &&
																				'font-bold text-green-600',
																		)}
																	>
																		{match.score1}
																	</span>{' '}
																	-{' '}
																	<span
																		className={cn(
																			isTeam2Winner &&
																				'font-bold text-green-600',
																		)}
																	>
																		{match.score2}
																	</span>
																</div>
															) : (
																<div className="text-muted-foreground text-sm">
																	Risultato non inserito
																</div>
															)}
															<Button variant="outline" size="sm" asChild>
																<Link
																	to={`/playground/${params.playgroundId}/matches/${match.id}/edit`}
																	state={{
																		backLink: `/playground/${params.playgroundId}/playoff`,
																	}}
																>
																	<Pencil className="h-4 w-4" />
																</Link>
															</Button>
														</div>
													</div>

													{/* Layout mobile */}
													<div className="md:hidden">
														{/* Squadra 1 */}
														<div className="mb-3 flex items-center justify-between">
															<div className="flex items-center gap-2">
																<Badge
																	className={
																		colorGroupClasses[match.team1.group.color]
																	}
																>
																	{match.team1.group.name}
																</Badge>
																<span className="font-medium">
																	{isTeam1Winner && '🏆 '}
																	{match.team1.name}
																</span>
															</div>
															{match.score1 !== null && (
																<span
																	className={cn(
																		'text-lg font-bold',
																		isTeam1Winner && 'text-green-600',
																	)}
																>
																	{match.score1}
																</span>
															)}
														</div>

														{/* VS */}
														<div className="text-muted-foreground mb-3 text-center text-sm">
															vs
														</div>

														{/* Squadra 2 */}
														<div className="mb-3 flex items-center justify-between">
															<div className="flex items-center gap-2">
																<Badge
																	className={
																		colorGroupClasses[match.team2.group.color]
																	}
																>
																	{match.team2.group.name}
																</Badge>
																<span className="font-medium">
																	{isTeam2Winner && '🏆 '}
																	{match.team2.name}
																</span>
															</div>
															{match.score2 !== null && (
																<span
																	className={cn(
																		'text-lg font-bold',
																		isTeam2Winner && 'text-green-600',
																	)}
																>
																	{match.score2}
																</span>
															)}
														</div>

														{/* Risultato non inserito per mobile */}
														{match.score1 === null && match.score2 === null && (
															<div className="text-muted-foreground text-center text-sm">
																Risultato non inserito
															</div>
														)}
													</div>
												</div>
											)
										})}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="playoff">
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Trophy className="h-5 w-5 text-yellow-500" />
									Playoff Finals - Domenica
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground mb-4 text-sm">
									16 squadre totali: 8 qualificate direttamente + 8 vincitrici
									dei play-in.
								</p>

								<div className="space-y-4">
									<div className="grid gap-4 md:grid-cols-2">
										<div>
											<h4 className="mb-2 font-semibold">
												Qualificate Direttamente:
											</h4>
											<div className="space-y-1">
												{directPlayoffTeams.map((team, index) => (
													<div
														key={team.id}
														className="flex items-center justify-between text-sm"
													>
														<div className="flex items-center gap-2">
															<span>
																{index + 1}. {team.name}
															</span>
															<span className="text-muted-foreground text-xs">
																{team.groupPosition}ª pos.
															</span>
														</div>
														<Badge
															className={colorGroupClasses[team.group.color]}
														>
															{team.group.name}
														</Badge>
													</div>
												))}
											</div>
										</div>

										<div>
											<h4 className="mb-2 font-semibold">
												Distribuzione per Posizione:
											</h4>
											<div className="space-y-1 text-sm">
												<div>
													• 1ª classificate: {firstPlacedTeams.length} squadre
												</div>
												<div>
													• 2ª classificate:{' '}
													{secondPlacedTeams.slice(0, 3).length} squadre
												</div>
												<div>• Vincitrici play-in: 8 squadre</div>
											</div>
										</div>
									</div>
									<div className="grid gap-4 md:grid-cols-2">
										<div>
											<h4 className="mb-2 font-semibold">
												Qualificate dai Play-in:
											</h4>
											<div className="space-y-1">
												{playinWinners.map((team, index) => (
													<div
														key={team.id}
														className="flex items-center justify-between text-sm"
													>
														<div className="flex items-center gap-2">
															<span>
																{index + 1}. {team.name}
															</span>
															<span className="text-muted-foreground text-xs">
																{team.groupPosition}ª pos.
															</span>
														</div>
														<Badge
															className={colorGroupClasses[team.group.color]}
														>
															{team.group.name}
														</Badge>
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Sezione Accoppiamenti Playoff */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center justify-between">
									<span>Accoppiamenti Playoff</span>

									<Button asChild>
										<Link
											to={`/playground/${params.playgroundId}/playoff/new-playoff-match`}
										>
											<Plus className="h-5 w-5" />
											<span className="hidden md:block">Aggiungi Partita</span>
										</Link>
									</Button>
								</CardTitle>
							</CardHeader>
							<CardContent>
								{playoffMatches.length === 0 ? (
									<div className="text-muted-foreground py-8 text-center">
										<p>Nessuna partita playoff creata ancora.</p>
										<p className="mt-2 text-sm">
											Crea le partite per iniziare il torneo playoff.
										</p>
									</div>
								) : (
									<div className="space-y-4">
										{playoffMatches.map((match) => {
											const isTeam1Winner = match.winner === match.team1Id
											const isTeam2Winner = match.winner === match.team2Id
											return (
												<div
													key={match.id}
													className="rounded-lg border p-3 md:p-4"
												>
													{/* Header con orario e campo */}
													<div className="text-muted-foreground mb-3 flex items-center justify-between text-sm">
														<span>
															{match.timeSlot} - {getMatchLabel(match.timeSlot)}{' '}
															- Campo {match.field}
														</span>
														<Button
															variant="outline"
															size="sm"
															asChild
															className="md:hidden"
														>
															<Link
																to={`/playground/${params.playgroundId}/matches/${match.id}/edit`}
																state={{
																	backLink: `/playground/${params.playgroundId}/playoff`,
																}}
															>
																<Pencil className="h-4 w-4" />
															</Link>
														</Button>
													</div>

													{/* Layout desktop */}
													<div className="hidden md:flex md:items-center md:justify-between">
														<div className="flex items-center gap-4">
															<div className="flex items-center gap-2">
																<Badge
																	className={
																		colorGroupClasses[match.team1.group.color]
																	}
																>
																	{match.team1.group.name}
																</Badge>
																<span className="font-medium">
																	{isTeam1Winner && '🏆 '}
																	{match.team1.name}
																</span>
															</div>
															<div className="text-muted-foreground">vs</div>
															<div className="flex items-center gap-2">
																<Badge
																	className={
																		colorGroupClasses[match.team2.group.color]
																	}
																>
																	{match.team2.group.name}
																</Badge>
																<span className="font-medium">
																	{isTeam2Winner && '🏆 '}
																	{match.team2.name}
																</span>
															</div>
														</div>
														<div className="flex items-center gap-2">
															{match.score1 !== null &&
															match.score2 !== null ? (
																<div className="text-lg">
																	<span
																		className={cn(
																			isTeam1Winner &&
																				'font-bold text-green-600',
																		)}
																	>
																		{match.score1}
																	</span>{' '}
																	-{' '}
																	<span
																		className={cn(
																			isTeam2Winner &&
																				'font-bold text-green-600',
																		)}
																	>
																		{match.score2}
																	</span>
																</div>
															) : (
																<div className="text-muted-foreground text-sm">
																	Risultato non inserito
																</div>
															)}
															<Button variant="outline" size="sm" asChild>
																<Link
																	to={`/playground/${params.playgroundId}/matches/${match.id}/edit`}
																	state={{
																		backLink: `/playground/${params.playgroundId}/playoff`,
																	}}
																>
																	<Pencil className="h-4 w-4" />
																</Link>
															</Button>
														</div>
													</div>

													{/* Layout mobile */}
													<div className="md:hidden">
														{/* Squadra 1 */}
														<div className="mb-3 flex items-center justify-between">
															<div className="flex items-center gap-2">
																<Badge
																	className={
																		colorGroupClasses[match.team1.group.color]
																	}
																>
																	{match.team1.group.name}
																</Badge>
																<span className="font-medium">
																	{isTeam1Winner && '🏆 '}
																	{match.team1.name}
																</span>
															</div>
															{match.score1 !== null && (
																<span
																	className={cn(
																		'text-lg font-bold',
																		isTeam1Winner && 'text-green-600',
																	)}
																>
																	{match.score1}
																</span>
															)}
														</div>

														{/* VS */}
														<div className="text-muted-foreground mb-3 text-center text-sm">
															vs
														</div>

														{/* Squadra 2 */}
														<div className="mb-3 flex items-center justify-between">
															<div className="flex items-center gap-2">
																<Badge
																	className={
																		colorGroupClasses[match.team2.group.color]
																	}
																>
																	{match.team2.group.name}
																</Badge>
																<span className="font-medium">
																	{isTeam2Winner && '🏆 '}
																	{match.team2.name}
																</span>
															</div>
															{match.score2 !== null && (
																<span
																	className={cn(
																		'text-lg font-bold',
																		isTeam2Winner && 'text-green-600',
																	)}
																>
																	{match.score2}
																</span>
															)}
														</div>

														{/* Risultato non inserito per mobile */}
														{match.score1 === null && match.score2 === null && (
															<div className="text-muted-foreground text-center text-sm">
																Risultato non inserito
															</div>
														)}
													</div>
												</div>
											)
										})}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="bracket">
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Trophy className="h-5 w-5 text-yellow-500" />
									Tabellone Playoff
								</CardTitle>
							</CardHeader>
							<CardContent>
								{playoffMatches.length === 0 ? (
									<div className="text-muted-foreground py-8 text-center">
										<p>Nessuna partita playoff creata ancora.</p>
										<p className="mt-2 text-sm">
											Crea le partite per visualizzare il tabellone.
										</p>
									</div>
								) : (
									<div className="overflow-x-auto">
										<div>
											{/* Tabellone principale - Struttura orizzontale */}
											<div className="space-y-8">
												{/* Ottavi di Finale */}
												{(finalEightMatches.length > 0 ||
													emptySlotsFinalEight > 0) && (
													<div className="space-y-4">
														<h3 className="text-center text-lg font-bold text-blue-600">
															Ottavi di Finale
														</h3>
														<div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
															{finalEightMatches.map((match, index) => {
																const isTeam1Winner =
																	match.winner === match.team1Id
																const isTeam2Winner =
																	match.winner === match.team2Id
																return (
																	<div
																		key={match.id}
																		className="rounded-lg border-2 border-blue-300 bg-blue-50 p-3 transition-all"
																	>
																		<div className="mb-2 text-center text-xs font-medium text-blue-600">
																			Ottavo {index + 1} - {match.timeSlot}
																		</div>
																		<div className="space-y-2">
																			<div
																				className={cn(
																					'flex items-center justify-between gap-x-2 rounded p-2 text-xs',
																					isTeam1Winner
																						? 'border border-green-300 bg-green-100'
																						: 'bg-white',
																				)}
																			>
																				<div className="flex flex-col items-center gap-1">
																					<span className="text-xs font-medium">
																						{isTeam1Winner && '🏆 '}
																						{match.team1.name}
																					</span>
																					<Badge
																						className={cn(
																							'text-xs',
																							colorGroupClasses[
																								match.team1.group.color
																							],
																						)}
																					>
																						{match.team1.group.name}
																					</Badge>
																				</div>

																				<span
																					className={cn(
																						'text-sm font-bold',
																						isTeam1Winner && 'text-green-600',
																					)}
																				>
																					{match.score1 ?? '-'}
																				</span>
																			</div>
																			<div
																				className={cn(
																					'flex items-center justify-between gap-x-2 rounded p-2 text-xs',
																					isTeam2Winner
																						? 'border border-green-300 bg-green-100'
																						: 'bg-white',
																				)}
																			>
																				<div className="flex flex-col items-center gap-1">
																					<span className="text-xs font-medium">
																						{isTeam2Winner && '🏆 '}
																						{match.team2.name}
																					</span>
																					<Badge
																						className={cn(
																							'text-xs',
																							colorGroupClasses[
																								match.team2.group.color
																							],
																						)}
																					>
																						{match.team2.group.name}
																					</Badge>
																				</div>

																				<span
																					className={cn(
																						'text-sm font-bold',
																						isTeam2Winner && 'text-green-600',
																					)}
																				>
																					{match.score2 ?? '-'}
																				</span>
																			</div>
																		</div>
																		<div className="mt-2 text-center">
																			<Button
																				variant="outline"
																				size="sm"
																				asChild
																			>
																				<Link
																					to={`/playground/${params.playgroundId}/matches/${match.id}/edit`}
																					state={{
																						backLink: `/playground/${params.playgroundId}/playoff`,
																					}}
																				>
																					<Pencil className="h-3 w-3" />
																				</Link>
																			</Button>
																		</div>
																	</div>
																)
															})}
															{emptySlotsFinalEight > 0 &&
																Array.from(
																	{ length: emptySlotsFinalEight },
																	(_, i) => (
																		<div
																			key={i}
																			className="flex items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 p-3 transition-all"
																		>
																			<div className="mb-2 text-center text-xs font-medium text-gray-500">
																				Ottavo{' '}
																				{finalEightMatches.length + i + 1}
																				<br />
																				Non creata
																			</div>
																		</div>
																	),
																)}
														</div>
													</div>
												)}

												{/* Quarti di Finale */}
												{(finalFourMatches.length > 0 ||
													emptySlotsFinalFour > 0) && (
													<div className="space-y-4">
														<h3 className="text-center text-lg font-bold text-purple-600">
															Quarti di Finale
														</h3>
														<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
															{finalFourMatches.map((match, index) => {
																const isTeam1Winner =
																	match.winner === match.team1Id
																const isTeam2Winner =
																	match.winner === match.team2Id
																return (
																	<div
																		key={match.id}
																		className={cn(
																			'rounded-lg border-2 p-3 transition-all',
																			match
																				? 'border-purple-300 bg-purple-50'
																				: 'border-gray-200 bg-gray-50',
																		)}
																	>
																		{match ? (
																			<>
																				<div className="mb-2 text-center text-xs font-medium text-purple-600">
																					Quarto {index + 1}
																					<br />
																					{match.timeSlot}
																				</div>
																				<div className="space-y-2">
																					<div
																						className={cn(
																							'flex items-center justify-between rounded p-2 text-xs',
																							isTeam1Winner
																								? 'border border-green-300 bg-green-100'
																								: 'bg-white',
																						)}
																					>
																						<div className="flex flex-col gap-1">
																							<Badge
																								className={cn(
																									'text-xs',
																									colorGroupClasses[
																										match.team1.group.color
																									],
																								)}
																							>
																								{match.team1.group.name}
																							</Badge>
																							<span className="text-xs font-medium">
																								{isTeam1Winner && '🏆 '}
																								{match.team1.name}
																							</span>
																						</div>
																						<span
																							className={cn(
																								'text-sm font-bold',
																								isTeam1Winner &&
																									'text-green-600',
																							)}
																						>
																							{match.score1 ?? '-'}
																						</span>
																					</div>
																					<div
																						className={cn(
																							'flex items-center justify-between rounded p-2 text-xs',
																							isTeam2Winner
																								? 'border border-green-300 bg-green-100'
																								: 'bg-white',
																						)}
																					>
																						<div className="flex flex-col gap-1">
																							<Badge
																								className={cn(
																									'text-xs',
																									colorGroupClasses[
																										match.team2.group.color
																									],
																								)}
																							>
																								{match.team2.group.name}
																							</Badge>
																							<span className="text-xs font-medium">
																								{isTeam2Winner && '🏆 '}
																								{match.team2.name}
																							</span>
																						</div>
																						<span
																							className={cn(
																								'text-sm font-bold',
																								isTeam2Winner &&
																									'text-green-600',
																							)}
																						>
																							{match.score2 ?? '-'}
																						</span>
																					</div>
																				</div>
																				<div className="mt-2 text-center">
																					<Button
																						variant="outline"
																						size="sm"
																						asChild
																					>
																						<Link
																							to={`/playground/${params.playgroundId}/matches/${match.id}/edit`}
																							state={{
																								backLink: `/playground/${params.playgroundId}/playoff`,
																							}}
																						>
																							<Pencil className="h-3 w-3" />
																						</Link>
																					</Button>
																				</div>
																			</>
																		) : (
																			<div className="text-center text-sm text-gray-500">
																				Quarto {index + 1}
																				<br />
																				<span className="text-xs">
																					Non creata
																				</span>
																			</div>
																		)}
																	</div>
																)
															})}
															{emptySlotsFinalFour > 0 &&
																Array.from(
																	{ length: emptySlotsFinalFour },
																	(_, i) => (
																		<div
																			key={i}
																			className="flex items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 p-3 transition-all"
																		>
																			<div className="text-center text-sm text-gray-500">
																				Quarto {finalFourMatches.length + i + 1}
																				<br />
																				<span className="text-xs">
																					Non creata
																				</span>
																			</div>
																		</div>
																	),
																)}
														</div>
													</div>
												)}

												{/* Semifinali */}
												{(finalTwoMatches.length > 0 ||
													emptySlotsFinalTwo > 0) && (
													<div className="space-y-4">
														<h3 className="text-center text-lg font-bold text-orange-600">
															Semifinali
														</h3>
														<div className="grid grid-cols-2 gap-4 md:grid-cols-2">
															{finalTwoMatches.map((match, index) => {
																const isTeam1Winner =
																	match.winner === match.team1Id
																const isTeam2Winner =
																	match.winner === match.team2Id
																return (
																	<div
																		key={match.id}
																		className={cn(
																			'rounded-lg border-2 p-3 transition-all',
																			match
																				? 'border-orange-300 bg-orange-50'
																				: 'border-gray-200 bg-gray-50',
																		)}
																	>
																		{match ? (
																			<>
																				<div className="mb-2 text-center text-xs font-medium text-orange-600">
																					Semifinale {index + 1}
																					<br />
																					{match.timeSlot}
																				</div>
																				<div className="space-y-2">
																					<div
																						className={cn(
																							'flex items-center justify-between rounded p-2 text-xs',
																							isTeam1Winner
																								? 'border border-green-300 bg-green-100'
																								: 'bg-white',
																						)}
																					>
																						<div className="flex flex-col gap-1">
																							<Badge
																								className={cn(
																									'text-xs',
																									colorGroupClasses[
																										match.team1.group.color
																									],
																								)}
																							>
																								{match.team1.group.name}
																							</Badge>
																							<span className="text-xs font-medium">
																								{isTeam1Winner && '🏆 '}
																								{match.team1.name}
																							</span>
																						</div>
																						<span
																							className={cn(
																								'text-sm font-bold',
																								isTeam1Winner &&
																									'text-green-600',
																							)}
																						>
																							{match.score1 ?? '-'}
																						</span>
																					</div>
																					<div
																						className={cn(
																							'flex items-center justify-between rounded p-2 text-xs',
																							isTeam2Winner
																								? 'border border-green-300 bg-green-100'
																								: 'bg-white',
																						)}
																					>
																						<div className="flex flex-col gap-1">
																							<Badge
																								className={cn(
																									'text-xs',
																									colorGroupClasses[
																										match.team2.group.color
																									],
																								)}
																							>
																								{match.team2.group.name}
																							</Badge>
																							<span className="text-xs font-medium">
																								{isTeam2Winner && '🏆 '}
																								{match.team2.name}
																							</span>
																						</div>
																						<span
																							className={cn(
																								'text-sm font-bold',
																								isTeam2Winner &&
																									'text-green-600',
																							)}
																						>
																							{match.score2 ?? '-'}
																						</span>
																					</div>
																				</div>
																				<div className="mt-2 text-center">
																					<Button
																						variant="outline"
																						size="sm"
																						asChild
																					>
																						<Link
																							to={`/playground/${params.playgroundId}/matches/${match.id}/edit`}
																							state={{
																								backLink: `/playground/${params.playgroundId}/playoff`,
																							}}
																						>
																							<Pencil className="h-3 w-3" />
																						</Link>
																					</Button>
																				</div>
																			</>
																		) : (
																			<div className="text-center text-sm text-gray-500">
																				Semifinale {index + 1}
																				<br />
																				<span className="text-xs">
																					Non creata
																				</span>
																			</div>
																		)}
																	</div>
																)
															})}
															{emptySlotsFinalTwo > 0 &&
																Array.from(
																	{ length: emptySlotsFinalTwo },
																	(_, i) => (
																		<div
																			key={i}
																			className="flex items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 p-3 transition-all"
																		>
																			<div className="text-center text-sm text-gray-500">
																				Semifinale{' '}
																				{finalTwoMatches.length + i + 1}
																				<br />
																				<span className="text-xs">
																					Non creata
																				</span>
																			</div>
																		</div>
																	),
																)}
														</div>
													</div>
												)}

												{/* Terzo posto */}
												{(finalThreeMatches.length > 0 ||
													emptySlotsFinalThree > 0) && (
													<div className="space-y-4">
														<h3 className="text-center text-lg font-bold text-gray-600">
															Terzo posto
														</h3>
														<div className="flex justify-center">
															<div className="w-full max-w-md">
																{finalThreeMatches.map((match) => {
																	const isTeam1Winner =
																		match.winner === match.team1Id
																	const isTeam2Winner =
																		match.winner === match.team2Id
																	return (
																		<div
																			key={match.id}
																			className={cn(
																				'rounded-lg border-2 p-3 transition-all',
																				match
																					? 'border-gray-300 bg-gray-50'
																					: 'border-gray-200 bg-gray-50',
																			)}
																		>
																			{match ? (
																				<>
																					<div className="mb-2 text-center text-xs font-medium text-gray-600">
																						Terzo posto - {match.timeSlot}
																					</div>
																					<div className="space-y-2">
																						<div
																							className={cn(
																								'flex items-center justify-between rounded p-2 text-xs',
																								isTeam1Winner
																									? 'border border-green-300 bg-green-100'
																									: 'bg-white',
																							)}
																						>
																							<div className="flex flex-col gap-1">
																								<Badge
																									className={cn(
																										'text-xs',
																										colorGroupClasses[
																											match.team1.group.color
																										],
																									)}
																								>
																									{match.team1.group.name}
																								</Badge>
																								<span className="text-xs font-medium">
																									{isTeam1Winner && '🏆 '}
																									{match.team1.name}
																								</span>
																							</div>
																							<span
																								className={cn(
																									'text-sm font-bold',
																									isTeam1Winner &&
																										'text-green-600',
																								)}
																							>
																								{match.score1 ?? '-'}
																							</span>
																						</div>
																						<div
																							className={cn(
																								'flex items-center justify-between rounded p-2 text-xs',
																								isTeam2Winner
																									? 'border border-green-300 bg-green-100'
																									: 'bg-white',
																							)}
																						>
																							<div className="flex flex-col gap-1">
																								<Badge
																									className={cn(
																										'text-xs',
																										colorGroupClasses[
																											match.team2.group.color
																										],
																									)}
																								>
																									{match.team2.group.name}
																								</Badge>
																								<span className="text-xs font-medium">
																									{isTeam2Winner && '🏆 '}
																									{match.team2.name}
																								</span>
																							</div>
																							<span
																								className={cn(
																									'text-sm font-bold',
																									isTeam2Winner &&
																										'text-green-600',
																								)}
																							>
																								{match.score2 ?? '-'}
																							</span>
																						</div>
																					</div>
																					<div className="mt-2 text-center">
																						<Button
																							variant="outline"
																							size="sm"
																							asChild
																						>
																							<Link
																								to={`/playground/${params.playgroundId}/matches/${match.id}/edit`}
																								state={{
																									backLink: `/playground/${params.playgroundId}/playoff`,
																								}}
																							>
																								<Pencil className="h-3 w-3" />
																							</Link>
																						</Button>
																					</div>
																				</>
																			) : (
																				<div className="text-center text-sm text-gray-500">
																					Terzo posto
																					<br />
																					<span className="text-xs">
																						Non creata
																					</span>
																				</div>
																			)}
																		</div>
																	)
																})}
																{emptySlotsFinalThree > 0 &&
																	Array.from(
																		{ length: emptySlotsFinalThree },
																		(_, i) => (
																			<div
																				key={i}
																				className="flex items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 p-3 transition-all"
																			>
																				<div className="text-center text-sm text-gray-500">
																					Terzo posto <br />
																					<span className="text-xs">
																						Non creata
																					</span>
																				</div>
																			</div>
																		),
																	)}
															</div>
														</div>
													</div>
												)}

												{/* Finale */}
												{(finalMatch.length > 0 || emptySlotsFinal > 0) && (
													<div className="space-y-4">
														<h3 className="text-center text-lg font-bold text-yellow-600">
															Finale
														</h3>
														<div className="flex justify-center">
															<div className="w-full max-w-md">
																{finalMatch.map((match) => {
																	const isTeam1Winner =
																		match.winner === match.team1Id
																	const isTeam2Winner =
																		match.winner === match.team2Id
																	return (
																		<div
																			key={match.id}
																			className={cn(
																				'rounded-lg border-2 p-3 transition-all',
																				match
																					? 'border-yellow-300 bg-yellow-50'
																					: 'border-gray-200 bg-gray-50',
																			)}
																		>
																			{match ? (
																				<>
																					<div className="mb-2 text-center text-xs font-medium text-yellow-600">
																						🏆 Campione - {match.timeSlot}
																					</div>
																					<div className="space-y-2">
																						<div
																							className={cn(
																								'flex items-center justify-between rounded p-2 text-xs',
																								isTeam1Winner
																									? 'border border-green-300 bg-green-100'
																									: 'bg-white',
																							)}
																						>
																							<div className="flex flex-col gap-1">
																								<Badge
																									className={cn(
																										'text-xs',
																										colorGroupClasses[
																											match.team1.group.color
																										],
																									)}
																								>
																									{match.team1.group.name}
																								</Badge>
																								<span className="text-xs font-medium">
																									{isTeam1Winner && '👑 '}
																									{match.team1.name}
																								</span>
																							</div>
																							<span
																								className={cn(
																									'text-sm font-bold',
																									isTeam1Winner &&
																										'text-green-600',
																								)}
																							>
																								{match.score1 ?? '-'}
																							</span>
																						</div>
																						<div
																							className={cn(
																								'flex items-center justify-between rounded p-2 text-xs',
																								isTeam2Winner
																									? 'border border-green-300 bg-green-100'
																									: 'bg-white',
																							)}
																						>
																							<div className="flex flex-col gap-1">
																								<Badge
																									className={cn(
																										'text-xs',
																										colorGroupClasses[
																											match.team2.group.color
																										],
																									)}
																								>
																									{match.team2.group.name}
																								</Badge>
																								<span className="text-xs font-medium">
																									{isTeam2Winner && '👑 '}
																									{match.team2.name}
																								</span>
																							</div>
																							<span
																								className={cn(
																									'text-sm font-bold',
																									isTeam2Winner &&
																										'text-green-600',
																								)}
																							>
																								{match.score2 ?? '-'}
																							</span>
																						</div>
																					</div>
																					<div className="mt-2 text-center">
																						<Button
																							variant="outline"
																							size="sm"
																							asChild
																						>
																							<Link
																								to={`/playground/${params.playgroundId}/matches/${match.id}/edit`}
																								state={{
																									backLink: `/playground/${params.playgroundId}/playoff`,
																								}}
																							>
																								<Pencil className="h-3 w-3" />
																							</Link>
																						</Button>
																					</div>
																				</>
																			) : (
																				<div className="text-center text-sm text-gray-500">
																					🏆 Campione
																					<br />
																					<span className="text-xs">
																						Non creata
																					</span>
																				</div>
																			)}
																		</div>
																	)
																})}
																{emptySlotsFinal > 0 &&
																	Array.from(
																		{ length: emptySlotsFinal },
																		(_, i) => (
																			<div
																				key={i}
																				className="flex items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 p-3 transition-all"
																			>
																				<div className="text-center text-sm text-gray-500">
																					🏆 Campione
																					<br />
																					<span className="text-xs">
																						Non creata
																					</span>
																				</div>
																			</div>
																		),
																	)}
															</div>
														</div>
													</div>
												)}
											</div>
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	)
}
