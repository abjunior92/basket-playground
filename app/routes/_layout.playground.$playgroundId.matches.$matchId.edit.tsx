import { PrismaClient } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
} from '@remix-run/node'
import {
	useActionData,
	useLoaderData,
	useLocation,
	useNavigation,
} from '@remix-run/react'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import invariant from 'tiny-invariant'
import { EditMatchScoreTab } from '~/components/EditMatch/EditMatchScoreTab'
import { ReplanMatchForm } from '~/components/EditMatch/ReplanMatchForm'
import { TemporaryAliasDialog } from '~/components/EditMatch/TemporaryAliasDialog'
import Header from '~/components/Header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { getTimeSlots } from '~/lib/utils'

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
			team1: { include: { players: { orderBy: { name: 'asc' } } } },
			team2: { include: { players: { orderBy: { name: 'asc' } } } },
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
	const backLink = formData.get('backLink') as string
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

		// Controllo se la partita ha già un risultato
		const currentMatch = await prisma.match.findUnique({
			where: { id: params.matchId },
			select: { score1: true, score2: true },
		})

		if (
			currentMatch &&
			(currentMatch.score1 !== null || currentMatch.score2 !== null)
		) {
			return json(
				{
					error:
						'Non è possibile ripianificare una partita che ha già un risultato',
				},
				{ status: 400 },
			)
		}

		// Controllo se un'altra squadra gioca già in quello slot
		// Escludo la partita corrente dal controllo
		const existingMatch = await prisma.match.findFirst({
			where: {
				playgroundId: params.playgroundId,
				day,
				timeSlot,
				id: { not: params.matchId }, // Escludo la partita corrente
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
		const isWalkover = formData.get('isWalkover') === 'on'

		const team1Id = formData.get('team1Id') as string
		const team2Id = formData.get('team2Id') as string

		// Se la partita è vinta a tavolino, saltiamo il controllo dei punti
		if (!isWalkover) {
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
	}

	return redirect(backLink)
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
	const navigation = useNavigation()
	const [temporaryAliases, setTemporaryAliases] = useState<
		Record<string, string>
	>({})
	const [aliasDialogOpen, setAliasDialogOpen] = useState(false)
	const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

	const timeSlots = getTimeSlots()
	const location = useLocation()
	const backLink =
		location.state?.backLink || `/playground/${match.playgroundId}/matches`

	const openAliasDialog = (playerId: string) => {
		setSelectedPlayerId(playerId)
		setAliasDialogOpen(true)
	}

	const errorTeam1 =
		actionData && 'errorTeam1' in actionData ? actionData.errorTeam1 : undefined
	const errorTeam2 =
		actionData && 'errorTeam2' in actionData ? actionData.errorTeam2 : undefined
	const replanError =
		actionData && 'error' in actionData && typeof actionData.error === 'string'
			? actionData.error
			: undefined

	const isNavigationBusy =
		navigation.state === 'submitting' || navigation.state === 'loading'

	return (
		<div className="mx-auto w-full max-w-5xl min-w-0 space-y-5 pb-10 md:space-y-6 md:p-6">
			<Header title="Modifica partita" backLink={backLink} icon={<Pencil />} />

			<Tabs defaultValue="scores" className="w-full min-w-0">
				<TabsList>
					<TabsTrigger value="scores">Risultato</TabsTrigger>
					<TabsTrigger value="planner">Ripianifica</TabsTrigger>
				</TabsList>

				<TabsContent
					value="scores"
					className="mt-4 w-full min-w-0 space-y-5 focus-visible:outline-none"
				>
					<EditMatchScoreTab
						backLink={backLink}
						score1={match.score1}
						score2={match.score2}
						team1={match.team1}
						team2={match.team2}
						matchId={match.id}
						playerStatsMap={playerStatsMap}
						temporaryAliases={temporaryAliases}
						onOpenAliasDialog={openAliasDialog}
						errorTeam1={errorTeam1}
						errorTeam2={errorTeam2}
					/>
				</TabsContent>
				<TabsContent
					value="planner"
					className="mt-4 w-full min-w-0 focus-visible:outline-none"
				>
					<ReplanMatchForm
						backLink={backLink}
						match={{
							day: match.day,
							timeSlot: match.timeSlot,
							field: match.field,
							team1Id: match.team1Id,
							team2Id: match.team2Id,
						}}
						timeSlots={timeSlots}
						groups={groups}
						replanError={replanError}
						isSubmitting={isNavigationBusy}
					/>
				</TabsContent>
			</Tabs>

			<TemporaryAliasDialog
				open={aliasDialogOpen}
				onOpenChange={setAliasDialogOpen}
				aliasValue={
					selectedPlayerId ? temporaryAliases[selectedPlayerId] || '' : ''
				}
				onAliasChange={(value) => {
					if (selectedPlayerId) {
						setTemporaryAliases((prev) => ({
							...prev,
							[selectedPlayerId]: value,
						}))
					}
				}}
			/>
		</div>
	)
}
