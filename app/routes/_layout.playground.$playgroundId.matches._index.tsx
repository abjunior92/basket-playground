import { PrismaClient } from '@prisma/client'
import {
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Link, useLoaderData, useParams, Form } from '@remix-run/react'
import { CalendarRange, Pencil, Plus, Trash2 } from 'lucide-react'
import invariant from 'tiny-invariant'
import DialogAlert from '~/components/DialogAlert'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
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

	return json({ error: 'Azione non riconosciuta' }, { status: 400 })
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const matches = await prisma.match.findMany({
		where: {
			playgroundId: params.playgroundId,
		},
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

	// Raggruppiamo le partite per giorno
	const matchesByDay = matches.reduce(
		(acc, match) => {
			acc[match.day] = acc[match.day] || []
			acc[match.day]?.push(match)
			return acc
		},
		{} as Record<number, typeof matches>,
	)

	return json({ matchesByDay })
}

export default function Matches() {
	const { matchesByDay } = useLoaderData<typeof loader>()
	const params = useParams()

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
			{Object.keys(matchesByDay).map((day) => (
				<div key={day} className="mb-6">
					<h2 className="mb-2 text-xl font-semibold">{getDayLabel(day)}</h2>
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
								{matchesByDay[Number(day)]?.map((match) => {
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
				</div>
			))}
		</div>
	)
}
