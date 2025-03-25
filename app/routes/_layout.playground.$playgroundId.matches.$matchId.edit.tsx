import { PrismaClient } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { Pencil } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { Separator } from '~/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { getDayLabel, getTimeSlots } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Modifica Risultato' },
		{ name: 'description', content: 'Modifica Risultato' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	invariant(params.matchId, 'matchId is required')
	const match = await prisma.match.findUnique({
		where: { id: params.matchId },
		include: {
			team1: { include: { players: true } },
			team2: { include: { players: true } },
			playerStats: true,
		},
	})

	const groups = await prisma.group.findMany({
		where: { playgroundId: params.playgroundId },
		include: {
			teams: true,
		},
	})

	if (!match) {
		throw new Response('Match non trovato', { status: 404 })
	}

	const playerStatsMap: Map<string, number> = new Map()
	match.playerStats.forEach((stat) => {
		playerStatsMap.set(stat.playerId, stat.points)
	})

	return { match, playerStatsMap, groups }
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	invariant(params.matchId, 'matchId is required')
	const formData = await request.formData()
	const formName = formData.get('intent') as 'score' | 'replan'

	if (formName === 'replan') {
		const day = Number(formData.get('day') as string)
		const timeSlot = formData.get('timeSlot') as string
		const field = formData.get('field') as string
		const team1Id = formData.get('team1Id') as string
		const team2Id = formData.get('team2Id') as string

		if (!day || !timeSlot || !field || !team1Id || !team2Id) {
			return json({ error: 'Tutti i campi sono obbligatori' }, { status: 400 })
		}

		// Controllo se la squadra gioca già in quello slot
		const existingMatch = await prisma.match.findFirst({
			where: {
				playgroundId: params.playgroundId,
				day,
				timeSlot,
				OR: [
					{ team1Id },
					{ team2Id },
					{ team1Id: team2Id },
					{ team2Id: team1Id },
				],
			},
		})

		if (existingMatch) {
			return json(
				{ error: 'Una squadra è già impegnata in questo orario' },
				{ status: 400 },
			)
		}

		await prisma.match.update({
			where: { id: params.matchId, playgroundId: params.playgroundId },
			data: { day, timeSlot, field, team1Id, team2Id },
		})
	} else {
		const score1 = Number(formData.get('score1') || '0')
		const score2 = Number(formData.get('score2') || '0')

		const team1Id = formData.get('team1Id') as string
		const team2Id = formData.get('team2Id') as string

		const winnerTeamId =
			score1 > score2 ? team1Id : score2 > score1 ? team2Id : null

		await prisma.match.update({
			where: { id: params.matchId, playgroundId: params.playgroundId },
			data: { score1, score2, winner: winnerTeamId },
		})

		const playerStats = []

		// Raccogliamo i dati dei punti per i giocatori della squadra 1
		for (const playerId of formData.getAll('team1Players[]') as string[]) {
			const points = parseInt(
				(formData.get(`player-${playerId}`) as string) || '0',
			)
			playerStats.push({ playerId, points })
		}

		// Raccogliamo i dati dei punti per i giocatori della squadra 2
		for (const playerId of formData.getAll('team2Players[]') as string[]) {
			const points = parseInt(
				(formData.get(`player-${playerId}`) as string) || '0',
			)
			playerStats.push({ playerId, points })
		}

		// Aggiorniamo i punti segnati dai giocatori
		for (const stat of playerStats) {
			// Recuperiamo il punteggio precedente del giocatore in questa partita
			const existingStat = await prisma.playerMatchStats.findUnique({
				where: {
					matchId_playerId: {
						matchId: params.matchId,
						playerId: stat.playerId,
					},
				},
				select: { points: true },
			})

			const previousPoints = existingStat?.points || 0

			await prisma.playerMatchStats.upsert({
				where: {
					matchId_playerId: {
						matchId: params.matchId,
						playerId: stat.playerId,
					},
				},
				update: {
					points: stat.points,
				},
				create: {
					matchId: params.matchId,
					playerId: stat.playerId,
					points: stat.points,
				},
			})

			// Aggiorniamo il totale dei punti segnati dal giocatore
			await prisma.player.update({
				where: { id: stat.playerId, playgroundId: params.playgroundId },
				data: {
					// Sottrai il vecchio punteggio
					totalPoints: { decrement: previousPoints },
				},
			})

			// Poi aggiungiamo il nuovo punteggio
			await prisma.player.update({
				where: { id: stat.playerId, playgroundId: params.playgroundId },
				data: {
					// Aggiungi il nuovo punteggio
					totalPoints: { increment: stat.points },
				},
			})
		}

		const isCountTeam1Ok = countTeam1(formData) === score1
		const isCountTeam2Ok = countTeam2(formData) === score2

		// Controllo se i punti segnati coincidono con i risultati
		if (!isCountTeam1Ok && !isCountTeam2Ok) {
			return json(
				{
					errorTeam1: 'I punti non coincidono con i risultati',
					errorTeam2: 'I punti non coincidono con i risultati',
				},
				{ status: 400 },
			)
		}

		if (!isCountTeam1Ok) {
			return json(
				{ errorTeam1: 'I punti non coincidono con i risultati' },
				{ status: 400 },
			)
		}

		if (!isCountTeam2Ok) {
			return json(
				{ errorTeam2: 'I punti non coincidono con i risultati' },
				{ status: 400 },
			)
		}
	}

	return redirect(`/playground/${params.playgroundId}/matches`)
}

const countTeam1 = (formData: FormData) => {
	let count = 0
	for (const playerId of formData.getAll('team1Players[]') as string[]) {
		const points = parseInt(
			(formData.get(`player-${playerId}`) as string) || '0',
		)
		count += points
	}
	return count
}

const countTeam2 = (formData: FormData) => {
	let count = 0
	for (const playerId of formData.getAll('team2Players[]') as string[]) {
		const points = parseInt(
			(formData.get(`player-${playerId}`) as string) || '0',
		)
		count += points
	}
	return count
}

export default function EditMatch() {
	const { match, playerStatsMap, groups } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	const timeSlots = getTimeSlots()

	return (
		<div className="md:p-4">
			<Header
				title="Modifica partita"
				backLink={`/playground/${match.playgroundId}/matches`}
				icon={<Pencil />}
			/>
			<Tabs defaultValue="scores" className="mt-4 w-full">
				<TabsList>
					<TabsTrigger value="scores">Risultato</TabsTrigger>
					<TabsTrigger value="planner">Ripianifica</TabsTrigger>
				</TabsList>
				<TabsContent value="scores">
					<h4 className="mt-4 flex justify-between text-xl">
						{match.team1.name} <span>vs</span> {match.team2.name}
					</h4>

					<Form method="post" className="mt-4">
						<div className="flex justify-between">
							<label>
								<input hidden name="team1Id" defaultValue={match.team1Id} />
								<Input
									type="number"
									name="score1"
									defaultValue={match.score1 ?? 0}
									className="w-24 md:w-64"
									inputMode="numeric"
									required
								/>
							</label>

							<label>
								<input hidden name="team2Id" defaultValue={match.team2Id} />
								<Input
									type="number"
									name="score2"
									defaultValue={match.score2 ?? 0}
									className="w-24 md:w-64"
									inputMode="numeric"
									required
								/>
							</label>
						</div>

						<Separator className="mb-4 mt-6" />

						<div className="flex w-full justify-center">
							<h4 className="text-xl font-bold">Giocatori</h4>
						</div>

						<div className="flex justify-between">
							<div className="flex flex-col space-y-2">
								{match.team1.players.map((player) => (
									<div key={player.id}>
										<label>
											{player.warnings === 1 && '🟨 '}
											{player.isExpelled && '🟥 '}
											{player.name} {player.surname}:
											<input
												hidden
												name={`team1Players[]`}
												defaultValue={player.id}
											/>
											<Input
												type="number"
												name={`player-${player.id}`}
												className="w-24 md:w-64"
												inputMode="numeric"
												defaultValue={playerStatsMap.get(player.id) ?? 0}
											/>
										</label>
									</div>
								))}

								<p className="text-red-500">
									{actionData &&
										'errorTeam1' in actionData &&
										actionData.errorTeam1}
								</p>
							</div>

							<div className="flex flex-col space-y-2">
								{match.team2.players.map((player) => (
									<div key={player.id} className="place-self-end">
										<label>
											{player.warnings === 1 && '🟨 '}
											{player.isExpelled && '🟥 '}
											{player.name} {player.surname}:
											<input
												hidden
												name={`team2Players[]`}
												defaultValue={player.id}
											/>
											<Input
												type="number"
												name={`player-${player.id}`}
												className="w-24 place-self-end md:w-64"
												inputMode="numeric"
												defaultValue={playerStatsMap.get(player.id) ?? 0}
											/>
										</label>
									</div>
								))}

								<p className="text-red-500">
									{actionData &&
										'errorTeam2' in actionData &&
										actionData.errorTeam2}
								</p>
							</div>
						</div>

						<Button
							type="submit"
							name="intent"
							value="score"
							className="mt-8 w-full md:w-auto"
						>
							Salva
						</Button>
					</Form>
				</TabsContent>
				<TabsContent value="planner">
					<Form method="post" className="mt-4 space-y-4">
						<div>
							<label htmlFor="day">Giorno:</label>
							<Select name="day" defaultValue={`${match.day}`}>
								<SelectTrigger>
									<SelectValue placeholder="Seleziona un giorno" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Giorno</SelectLabel>
										{['1', '2', '3', '4', '5', '6', '7'].map((d) => (
											<SelectItem key={d} value={d}>
												{getDayLabel(d)}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						<div>
							<label htmlFor="timeSlot">Orario:</label>
							<Select name="timeSlot" defaultValue={match.timeSlot}>
								<SelectTrigger>
									<SelectValue placeholder="Seleziona un orario" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Orario</SelectLabel>
										{timeSlots.map((slot) => (
											<SelectItem key={slot} value={slot}>
												{slot}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						<div>
							<label htmlFor="field">Campo:</label>
							<Select name="field" defaultValue={match.field}>
								<SelectTrigger>
									<SelectValue placeholder="Seleziona un campo" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Campo</SelectLabel>
										{['A', 'B'].map((field) => (
											<SelectItem key={field} value={field}>
												{field}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						<div>
							<label htmlFor="team1Id">Squadra 1:</label>
							<Select name="team1Id" defaultValue={match.team1Id}>
								<SelectTrigger>
									<SelectValue placeholder="Seleziona una squadra" />
								</SelectTrigger>
								<SelectContent>
									{groups.map((g) => (
										<SelectGroup key={g.id}>
											<SelectLabel>{g.name}</SelectLabel>
											{g.teams.map((t) => (
												<SelectItem key={t.id} value={t.id}>
													{t.name}
												</SelectItem>
											))}
										</SelectGroup>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<label htmlFor="team2Id">Squadra 2:</label>
							<Select name="team2Id" defaultValue={match.team2Id}>
								<SelectTrigger>
									<SelectValue placeholder="Seleziona una squadra avversaria" />
								</SelectTrigger>
								<SelectContent>
									{groups.map((g) => (
										<SelectGroup key={g.id}>
											<SelectLabel>{g.name}</SelectLabel>
											{g.teams.map((t) => (
												<SelectItem key={t.id} value={t.id}>
													{t.name}
												</SelectItem>
											))}
										</SelectGroup>
									))}
								</SelectContent>
							</Select>
						</div>

						<Button
							type="submit"
							name="intent"
							value="replan"
							className="w-full md:w-auto"
						>
							Ripianifica Partita
						</Button>
						{actionData && 'error' in actionData && (
							<p className="text-red-500">{actionData.error}</p>
						)}
					</Form>
				</TabsContent>
			</Tabs>
		</div>
	)
}
