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
import { Separator } from '~/components/ui/separator'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Modifica Risultato' },
		{ name: 'description', content: 'Modifica Risultato' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	const match = await prisma.match.findUnique({
		where: { id: params.matchId },
		include: {
			team1: { include: { players: true } },
			team2: { include: { players: true } },
			playerStats: true,
		},
	})

	if (!match) {
		throw new Response('Match non trovato', { status: 404 })
	}

	const playerStatsMap: Map<string, number> = new Map()
	match.playerStats.forEach((stat) => {
		playerStatsMap.set(stat.playerId, stat.points)
	})

	return { match, playerStatsMap }
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.matchId, 'matchId is required')
	const formData = await request.formData()
	const score1 = Number(formData.get('score1') || '0')
	const score2 = Number(formData.get('score2') || '0')

	const team1Id = formData.get('team1Id') as string
	const team2Id = formData.get('team2Id') as string

	const winnerTeamId =
		score1 > score2 ? team1Id : score2 > score1 ? team2Id : null

	await prisma.match.update({
		where: { id: params.matchId },
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
			where: { id: stat.playerId },
			data: {
				// Sottrai il vecchio punteggio
				totalPoints: { decrement: previousPoints },
			},
		})

		// Poi aggiungiamo il nuovo punteggio
		await prisma.player.update({
			where: { id: stat.playerId },
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

	return redirect('/matches')
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
	const { match, playerStatsMap } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	return (
		<div className="p-4">
			<Header
				title="Modifica Risultato"
				backLink="/matches"
				icon={<Pencil />}
			/>
			<h4 className="mt-4 flex justify-between text-xl">
				{match.team1.name} <span>vs</span> {match.team2.name}
			</h4>

			<Form method="post" className="mt-4">
				<div className="flex justify-between">
					<label>
						<input hidden name="team1Id" value={match.team1Id} />
						<Input
							type="number"
							name="score1"
							defaultValue={match.score1 ?? 0}
							className="w-64"
							required
						/>
					</label>

					<label>
						<input hidden name="team2Id" value={match.team2Id} />
						<Input
							type="number"
							name="score2"
							defaultValue={match.score2 ?? 0}
							className="w-64"
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
									<input hidden name={`team1Players[]`} value={player.id} />
									<Input
										type="number"
										name={`player-${player.id}`}
										className="w-64"
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
									{player.name} {player.surname}:
									<input hidden name={`team2Players[]`} value={player.id} />
									<Input
										type="number"
										name={`player-${player.id}`}
										className="w-64 place-self-end"
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

				<Button type="submit" className="mt-8">
					Salva
				</Button>
			</Form>
		</div>
	)
}
