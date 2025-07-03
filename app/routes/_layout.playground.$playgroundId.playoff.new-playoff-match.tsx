import { PrismaClient } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData, useParams } from '@remix-run/react'
import { Plus } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { colorGroupClasses, type TeamWithPlayoffStats } from '~/lib/types'
import {
	calculateTiebreaker,
	cn,
	getDayLabel,
	getFinalTimeSlots,
	getMatchLabel,
	sortTeamsWithTiebreaker,
} from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Nuova Partita Playoff' },
		{ name: 'description', content: 'Crea una nuova partita playoff' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')

	// Recupera tutte le squadre del playground
	const teams = await prisma.team.findMany({
		where: { group: { playgroundId: params.playgroundId } },
		include: {
			group: true,
			matchesAsTeam1: {
				where: { day: { in: [1, 2, 3, 4, 6] } },
				select: { id: true, winner: true, score1: true, score2: true },
			},
			matchesAsTeam2: {
				where: { day: { in: [1, 2, 3, 4, 6] } },
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
			}
		})

	// Recupera le partite playoff esistenti per controllare gli slot occupati
	const existingPlayoffMatches = await prisma.match.findMany({
		where: {
			playgroundId: params.playgroundId,
			day: 7, // Domenica
		},
		include: {
			team1: { include: { group: true } },
			team2: { include: { group: true } },
		},
		orderBy: [{ timeSlot: 'asc' }, { field: 'asc' }],
	})

	// Combina le squadre qualificate direttamente con le vincitrici dei play-in
	const allPlayoffTeams = [...directPlayoffTeams, ...playinWinners]

	return {
		allPlayoffTeams,
		existingPlayoffMatches,
	}
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const formData = await request.formData()

	const day = Number(formData.get('day') as string)
	const timeSlot = formData.get('timeSlot') as string
	const field = formData.get('field') as string
	const team1Id = formData.get('team1Id') as string
	const team2Id = formData.get('team2Id') as string

	if (!day || !timeSlot || !field || !team1Id || !team2Id) {
		return json({ error: 'Tutti i campi sono obbligatori' }, { status: 400 })
	}

	if (team1Id === team2Id) {
		return json(
			{ error: 'Le due squadre non possono essere uguali' },
			{ status: 400 },
		)
	}

	// Controllo se una squadra gioca già in quello slot
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

	// Crea la nuova partita
	await prisma.match.create({
		data: {
			playgroundId: params.playgroundId,
			day,
			timeSlot,
			field,
			team1Id,
			team2Id,
		},
	})

	return redirect(`/playground/${params.playgroundId}/playoff`)
}

export default function NewPlayoffMatch() {
	const { allPlayoffTeams, existingPlayoffMatches } =
		useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const params = useParams()

	const timeSlots = getFinalTimeSlots()

	return (
		<div className="md:p-4">
			<Header
				title="Nuova Partita Playoff"
				backLink={`/playground/${params.playgroundId}/playoff`}
				icon={<Plus />}
			/>

			<Card className="mx-auto mt-4 max-w-2xl">
				<CardHeader>
					<CardTitle>Crea accoppiamento Playoff</CardTitle>
				</CardHeader>
				<CardContent>
					<Form method="post" className="space-y-4">
						<div>
							<label htmlFor="day" className="mb-2 block text-sm font-medium">
								Giorno:
							</label>
							<Select name="day" defaultValue="5" value="7">
								<SelectTrigger>
									<SelectValue placeholder="Seleziona un giorno" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Giorno</SelectLabel>
										<SelectItem value="7">{getDayLabel('7')}</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						<div>
							<label
								htmlFor="timeSlot"
								className="mb-2 block text-sm font-medium"
							>
								Orario:
							</label>
							<Select name="timeSlot">
								<SelectTrigger>
									<SelectValue placeholder="Seleziona un orario" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Orario</SelectLabel>
										{timeSlots.map((slot) => (
											<SelectItem key={slot} value={slot}>
												{`${getMatchLabel(slot)} - ${slot}`}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						<div>
							<label htmlFor="field" className="mb-2 block text-sm font-medium">
								Campo:
							</label>
							<Select name="field">
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
							<label
								htmlFor="team1Id"
								className="mb-2 block text-sm font-medium"
							>
								Squadra 1:
							</label>
							<Select name="team1Id">
								<SelectTrigger>
									<SelectValue placeholder="Seleziona una squadra" />
								</SelectTrigger>
								<SelectContent>
									{allPlayoffTeams.map((team) => (
										<SelectItem key={team.id} value={team.id}>
											{team.name} ({team.group.name})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<label
								htmlFor="team2Id"
								className="mb-2 block text-sm font-medium"
							>
								Squadra 2:
							</label>
							<Select name="team2Id">
								<SelectTrigger>
									<SelectValue placeholder="Seleziona una squadra avversaria" />
								</SelectTrigger>
								<SelectContent>
									{allPlayoffTeams.map((team) => (
										<SelectItem key={team.id} value={team.id}>
											{team.name} ({team.group.name})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{actionData && 'error' in actionData && (
							<div className="text-sm text-red-500">{actionData.error}</div>
						)}

						<div className="flex items-center gap-x-2">
							<Button type="submit" className="w-full md:w-auto">
								Crea Partita
							</Button>
						</div>
					</Form>
				</CardContent>
			</Card>

			{/* Sezione Partite Esistenti */}
			{existingPlayoffMatches.length > 0 && (
				<Card className="mx-auto mt-6 max-w-4xl">
					<CardHeader>
						<CardTitle>Partite Playoff Esistenti</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{existingPlayoffMatches.map((match) => {
								const isTeam1Winner = match.winner === match.team1Id
								const isTeam2Winner = match.winner === match.team2Id
								return (
									<div key={match.id} className="rounded-lg border p-3 md:p-4">
										{/* Header con orario e campo */}
										<div className="text-muted-foreground mb-3 flex items-center justify-between text-sm">
											<span>
												{match.timeSlot} - Campo {match.field}
											</span>
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
												{match.score1 !== null && match.score2 !== null ? (
													<div className="text-lg">
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
													</div>
												) : (
													<div className="text-muted-foreground text-sm">
														Risultato non inserito
													</div>
												)}
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
					</CardContent>
				</Card>
			)}
		</div>
	)
}
