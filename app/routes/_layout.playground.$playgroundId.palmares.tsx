import { PrismaClient } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
	useParams,
} from '@remix-run/react'
import { Award, Save } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import { isMatchFinal, isMatchThirdPlace } from '~/lib/utils'
import { checkUserIsLoggedIn } from '~/utils/helpers'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Palmares' },
		{ name: 'description', content: 'Salva palmares per questa edizione' },
	]
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	await checkUserIsLoggedIn(request)
	const playground = await prisma.playground.findUnique({
		where: { id: params.playgroundId },
		select: { year: true },
	})

	if (!playground) {
		throw new Response('Not Found', { status: 404 })
	}

	const existingPalmares = await prisma.tournamentPalmares.findFirst({
		where: { year: playground.year },
	})

	return json({ playgroundYear: playground.year, existingPalmares })
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	await checkUserIsLoggedIn(request)

	const playground = await prisma.playground.findUnique({
		where: { id: params.playgroundId },
	})

	if (!playground) {
		return json({ error: 'Torneo non trovato.' }, { status: 404 })
	}
	const year = playground.year

	const finalMatch = await prisma.match.findFirst({
		where: {
			playgroundId: params.playgroundId,
			day: 7,
			winner: { not: null },
			timeSlot: { in: ['22:00 > 22:15'] },
		},
		select: {
			id: true,
			winner: true,
			team1Id: true,
			team2Id: true,
			timeSlot: true,
		},
	})

	const thirdPlaceMatch = await prisma.match.findFirst({
		where: {
			playgroundId: params.playgroundId,
			day: 7,
			winner: { not: null },
			timeSlot: { in: ['21:40 > 21:55'] },
		},
		select: {
			id: true,
			winner: true,
			team1Id: true,
			team2Id: true,
			timeSlot: true,
		},
	})

	if (!finalMatch || !isMatchFinal(finalMatch.timeSlot)) {
		return json(
			{
				error:
					'Finale non completata. Inserisci il risultato della finale prima di salvare.',
			},
			{ status: 400 },
		)
	}

	if (!thirdPlaceMatch || !isMatchThirdPlace(thirdPlaceMatch.timeSlot)) {
		return json(
			{
				error:
					'Finale 3° posto non completata. Inserisci il risultato della finale 3° posto prima di salvare.',
			},
			{ status: 400 },
		)
	}

	const firstTeamId = finalMatch.winner!
	const secondTeamId =
		firstTeamId === finalMatch.team1Id ? finalMatch.team2Id : finalMatch.team1Id
	const thirdTeamId = thirdPlaceMatch.winner!

	const podiumTeamIds = [firstTeamId, secondTeamId, thirdTeamId]
	const podiumTeams = await prisma.team.findMany({
		where: { id: { in: podiumTeamIds } },
		include: {
			players: {
				select: {
					name: true,
					surname: true,
				},
				orderBy: [{ surname: 'asc' }, { name: 'asc' }],
			},
		},
	})

	const teamMap = new Map(podiumTeams.map((team) => [team.id, team]))
	const firstTeam = teamMap.get(firstTeamId)
	const secondTeam = teamMap.get(secondTeamId)
	const thirdTeam = teamMap.get(thirdTeamId)

	if (!firstTeam || !secondTeam || !thirdTeam) {
		return json({ error: 'Impossibile ricostruire il podio.' }, { status: 400 })
	}

	const playerStats = await prisma.playerMatchStats.findMany({
		where: {
			match: {
				playgroundId: params.playgroundId,
			},
		},
		select: {
			playerId: true,
			points: true,
			match: {
				select: {
					day: true,
				},
			},
			player: {
				select: {
					name: true,
					surname: true,
					team: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	})

	const groupScorerMap = new Map<
		string,
		{ name: string; surname: string; teamName: string; points: number }
	>()
	const finalsScorerMap = new Map<
		string,
		{ name: string; surname: string; teamName: string; points: number }
	>()

	for (const stat of playerStats) {
		if ([1, 2, 3, 4, 6].includes(stat.match.day)) {
			const previous = groupScorerMap.get(stat.playerId)
			groupScorerMap.set(stat.playerId, {
				name: stat.player.name,
				surname: stat.player.surname,
				teamName: stat.player.team.name,
				points: (previous?.points ?? 0) + stat.points,
			})
		}
		if ([5, 7].includes(stat.match.day)) {
			const previous = finalsScorerMap.get(stat.playerId)
			finalsScorerMap.set(stat.playerId, {
				name: stat.player.name,
				surname: stat.player.surname,
				teamName: stat.player.team.name,
				points: (previous?.points ?? 0) + stat.points,
			})
		}
	}

	const bestGroupScorer = [...groupScorerMap.values()].sort(
		(a, b) => b.points - a.points,
	)[0]
	const bestFinalsScorer = [...finalsScorerMap.values()].sort(
		(a, b) => b.points - a.points,
	)[0]

	if (!bestGroupScorer || !bestFinalsScorer) {
		return json(
			{
				error:
					'Statistiche giocatori insufficienti. Inserisci i punti giocatori di gironi e finali prima di salvare.',
			},
			{ status: 400 },
		)
	}

	await prisma.tournamentPalmares.upsert({
		where: { year },
		create: {
			year,
			tournamentName: playground.name,
			firstTeamName: firstTeam.name,
			firstTeamPlayers: firstTeam.players.map(
				(player) => `${player.name} ${player.surname}`,
			),
			secondTeamName: secondTeam.name,
			secondTeamPlayers: secondTeam.players.map(
				(player) => `${player.name} ${player.surname}`,
			),
			thirdTeamName: thirdTeam.name,
			thirdTeamPlayers: thirdTeam.players.map(
				(player) => `${player.name} ${player.surname}`,
			),
			bestGroupScorerName: bestGroupScorer.name,
			bestGroupScorerSurname: bestGroupScorer.surname,
			bestGroupScorerTeamName: bestGroupScorer.teamName,
			bestGroupScorerPoints: bestGroupScorer.points,
			bestFinalsScorerName: bestFinalsScorer.name,
			bestFinalsScorerSurname: bestFinalsScorer.surname,
			bestFinalsScorerTeamName: bestFinalsScorer.teamName,
			bestFinalsScorerPoints: bestFinalsScorer.points,
			sourcePlaygroundId: params.playgroundId,
		},
		update: {
			tournamentName: playground.name,
			firstTeamName: firstTeam.name,
			firstTeamPlayers: firstTeam.players.map(
				(player) => `${player.name} ${player.surname}`,
			),
			secondTeamName: secondTeam.name,
			secondTeamPlayers: secondTeam.players.map(
				(player) => `${player.name} ${player.surname}`,
			),
			thirdTeamName: thirdTeam.name,
			thirdTeamPlayers: thirdTeam.players.map(
				(player) => `${player.name} ${player.surname}`,
			),
			bestGroupScorerName: bestGroupScorer.name,
			bestGroupScorerSurname: bestGroupScorer.surname,
			bestGroupScorerTeamName: bestGroupScorer.teamName,
			bestGroupScorerPoints: bestGroupScorer.points,
			bestFinalsScorerName: bestFinalsScorer.name,
			bestFinalsScorerSurname: bestFinalsScorer.surname,
			bestFinalsScorerTeamName: bestFinalsScorer.teamName,
			bestFinalsScorerPoints: bestFinalsScorer.points,
			sourcePlaygroundId: params.playgroundId,
		},
	})

	return json({ success: `Palmares ${year} salvato correttamente.` })
}

export default function Palmares() {
	const { playgroundYear, existingPalmares } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()
	const { playgroundId } = useParams()

	return (
		<div className="flex h-full grow flex-col md:p-4">
			<div className="mb-4 flex items-center justify-between">
				<Header
					title="Palmares"
					backLink={`/playground/${playgroundId}`}
					icon={<Award />}
				/>
			</div>

			<div className="flex h-full flex-1 flex-col items-center justify-center space-y-4">
				<h2 className="text-center font-bold md:text-xl">
					Salva palmares per questa edizione
				</h2>
				{actionData && 'error' in actionData ? (
					<p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
						{actionData.error}
					</p>
				) : null}
				{actionData && 'success' in actionData ? (
					<p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
						{actionData.success}
					</p>
				) : null}

				<p className="text-muted-foreground text-sm">
					Edizione torneo: <b>{playgroundYear}</b>
				</p>
				<Form method="post" className="flex w-full max-w-sm flex-col gap-2">
					<Button type="submit">
						<Save className="h-5 w-5" />
						{navigation.state === 'submitting' ? 'Salvataggio...' : 'Salva'}
					</Button>
				</Form>
				{existingPalmares ? (
					<p className="text-muted-foreground text-center text-xs">
						Esiste gia un palmares per il {playgroundYear}. Con un nuovo
						salvataggio verra aggiornato.
					</p>
				) : null}
			</div>
		</div>
	)
}
