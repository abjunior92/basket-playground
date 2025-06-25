import { PrismaClient } from '@prisma/client'
import {
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
	type ActionFunctionArgs,
	redirect,
} from '@remix-run/node'
import {
	Link,
	useLoaderData,
	useParams,
	Form,
	useFetcher,
} from '@remix-run/react'
import { CalendarRange, Pencil, Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import invariant from 'tiny-invariant'
import DialogAlert from '~/components/DialogAlert'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { colorGroupClasses } from '~/lib/types'
import { cn, getDayLabel } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Calendario Partite' },
		{ name: 'description', content: 'Calendario Partite' },
	]
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const formData = await request.formData()
	const intent = formData.get('intent') as string

	if (intent === 'delete-match') {
		const matchId = formData.get('matchId') as string

		if (!matchId) {
			return json({ error: 'ID partita mancante' }, { status: 400 })
		}

		try {
			// Elimina la partita e tutti i dati correlati in una transazione
			await prisma.$transaction(async (tx) => {
				// 1. Recupera le statistiche dei giocatori per questa partita
				const playerStats = await tx.playerMatchStats.findMany({
					where: { matchId },
					select: { playerId: true, points: true },
				})

				// 2. Aggiorna i punteggi totali dei giocatori (sottrai i punti della partita)
				for (const stat of playerStats) {
					await tx.player.update({
						where: { id: stat.playerId },
						data: {
							totalPoints: { decrement: stat.points },
						},
					})
				}

				// 3. Elimina le statistiche dei giocatori per questa partita
				await tx.playerMatchStats.deleteMany({
					where: { matchId },
				})

				// 4. Elimina la partita
				await tx.match.delete({
					where: {
						id: matchId,
						playgroundId: params.playgroundId,
					},
				})
			})

			return json({ success: true })
		} catch (error) {
			console.error("Errore durante l'eliminazione della partita:", error)
			return json(
				{ error: "Errore durante l'eliminazione della partita" },
				{ status: 500 },
			)
		}
	}

	if (intent === 'filter-team') {
		const teamId = formData.get('teamId') as string
		const url = new URL(request.url)

		if (teamId === 'all') {
			url.searchParams.delete('teamId')
		} else {
			url.searchParams.set('teamId', teamId)
		}

		return redirect(url.pathname + url.search)
	}

	return json({ error: 'Azione non riconosciuta' }, { status: 400 })
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')

	// Recupera il teamId dall'URL se presente
	const url = new URL(request.url)
	const teamId = url.searchParams.get('teamId')

	// Costruisci la query per le partite
	const matchesWhere: any = {
		playgroundId: params.playgroundId,
	}

	// Aggiungi filtro per squadra se specificato
	if (teamId && teamId !== 'all') {
		matchesWhere.OR = [{ team1Id: teamId }, { team2Id: teamId }]
	}

	const matches = await prisma.match.findMany({
		where: matchesWhere,
		include: {
			team1: {
				include: {
					group: true,
				},
			},
			team2: {
				include: {
					group: true,
				},
			},
		},
		orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
	})

	// Recupera tutte le squadre del playground
	const teams = await prisma.team.findMany({
		where: {
			group: {
				playgroundId: params.playgroundId,
			},
		},
		include: {
			group: true,
		},
		orderBy: [{ group: { name: 'asc' } }, { name: 'asc' }],
	})

	// Raggruppiamo le partite per giorno
	const matchesByDay = matches.reduce(
		(acc, match) => {
			acc[match.day] = acc[match.day] || []
			acc[match.day]?.push(match)
			return acc
		},
		{} as Record<number, typeof matches>,
	)

	return json({ matchesByDay, teams, selectedTeamId: teamId || 'all' })
}

export default function Matches() {
	const { matchesByDay, teams, selectedTeamId } = useLoaderData<typeof loader>()
	const params = useParams()
	const [hiddenDays, setHiddenDays] = useState<Set<number>>(new Set())
	const fetcher = useFetcher()

	const toggleDayVisibility = (day: number) => {
		setHiddenDays((prev) => {
			const newSet = new Set(prev)
			if (newSet.has(day)) {
				newSet.delete(day)
			} else {
				newSet.add(day)
			}
			return newSet
		})
	}

	const handleTeamChange = (value: string) => {
		fetcher.submit({ intent: 'filter-team', teamId: value }, { method: 'post' })
	}

	return (
		<div className="md:p-4">
			<div className="mb-4 flex items-center justify-between">
				<Header
					title="Calendario Partite"
					backLink={`/playground/${params.playgroundId}`}
					icon={<CalendarRange />}
				/>

				<Button asChild>
					<Link to={`/playground/${params.playgroundId}/matches/new`}>
						<Plus className="h-5 w-5" />
						<span className="hidden md:block">Aggiungi Partita</span>
					</Link>
				</Button>
			</div>

			{/* Select per filtrare per squadra */}
			<div className="mb-6 w-full md:w-auto">
				<span className="text-sm">Filtra il calendario per squadra</span>
				<Select value={selectedTeamId} onValueChange={handleTeamChange}>
					<SelectTrigger className="w-full md:max-w-sm">
						<SelectValue placeholder="Filtra per squadra" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Tutte le squadre</SelectItem>
						{teams.map((team) => (
							<SelectItem key={team.id} value={team.id}>
								<div className="flex items-center gap-2">
									<Badge className={colorGroupClasses[team.group.color]}>
										{team.group.name}
									</Badge>
									{team.name}
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{Object.keys(matchesByDay).map((day) => {
				const dayNumber = Number(day)
				const isHidden = hiddenDays.has(dayNumber)

				return (
					<div key={day} className="py-4">
						<div className="mb-2 flex items-center justify-between">
							<h2
								className={cn(
									'text-xl font-semibold',
									isHidden && 'text-gray-400',
								)}
							>
								{getDayLabel(day) + ' - Giorno ' + day}
							</h2>
							<Button
								variant="outline"
								onClick={() => toggleDayVisibility(dayNumber)}
								className="w-32"
							>
								{isHidden ? (
									<>
										Mostra
										<EyeOff className="h-5 w-5" />
									</>
								) : (
									<>
										Nascondi
										<Eye className="h-5 w-5" />
									</>
								)}
							</Button>
						</div>
						{!isHidden ? (
							<div className="overflow-hidden rounded-lg border border-gray-300">
								<Table className="w-full border-collapse">
									<TableHeader>
										<TableRow className="bg-gray-100">
											<TableHead>⏱️ Orario</TableHead>
											<TableHead>📍 Campo</TableHead>
											<TableHead>👥 Squadra 1</TableHead>
											<TableHead>👥 Squadra 2</TableHead>
											<TableHead>📝 Risultato</TableHead>
											<TableHead>Azioni</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{matchesByDay[dayNumber]?.map((match) => {
											const isTeam1Winner = match.winner === match.team1Id
											const isTeam2Winner = match.winner === match.team2Id
											return (
												<TableRow key={match.id} className="text-center">
													<TableCell>{match.timeSlot}</TableCell>
													<TableCell>{match.field}</TableCell>
													<TableCell>
														<div className="flex flex-col items-center justify-center">
															<span>
																{isTeam1Winner && '🏆 '}
																{match.team1.name}
															</span>
															<Badge
																className={
																	colorGroupClasses[match.team1.group.color]
																}
															>
																{match.team1.group.name}
															</Badge>
														</div>
													</TableCell>
													<TableCell>
														<div className="flex flex-col items-center justify-center">
															<span>
																{isTeam2Winner && '🏆 '}
																{match.team2.name}
															</span>
															<Badge
																className={
																	colorGroupClasses[match.team2.group.color]
																}
															>
																{match.team2.group.name}
															</Badge>
														</div>
													</TableCell>
													<TableCell>
														<span
															className={cn(
																isTeam1Winner && 'font-bold text-green-600',
															)}
														>
															{match.score1}
														</span>{' '}
														-{' '}
														<span
															className={cn(
																isTeam2Winner && 'font-bold text-green-600',
															)}
														>
															{match.score2}
														</span>
													</TableCell>
													<TableCell>
														<div className="flex justify-center gap-2">
															<Button asChild variant="outline" size="sm">
																<Link
																	to={`/playground/${params.playgroundId}/matches/${match.id}/edit`}
																>
																	<Pencil className="h-4 w-4" />
																</Link>
															</Button>
															<Form
																id={`deleteMatchForm-${match.id}`}
																method="post"
															>
																<input
																	type="hidden"
																	name="intent"
																	value="delete-match"
																/>
																<input
																	type="hidden"
																	name="matchId"
																	value={match.id}
																/>
																<DialogAlert
																	trigger={
																		<Button
																			type="button"
																			variant="outline"
																			size="sm"
																			className="text-red-600 hover:bg-red-50 hover:text-red-700"
																		>
																			<Trash2 className="h-4 w-4" />
																		</Button>
																	}
																	title="Elimina partita"
																	description="Sei sicuro di voler eliminare questa partita? Questa azione non può essere annullata ed eliminerà anche tutti i risultati e i punteggi dei giocatori."
																	formId={`deleteMatchForm-${match.id}`}
																/>
															</Form>
														</div>
													</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							</div>
						) : (
							<div className="flex h-10 w-full justify-center rounded-lg border border-gray-300 bg-gray-100"></div>
						)}
					</div>
				)
			})}
		</div>
	)
}
