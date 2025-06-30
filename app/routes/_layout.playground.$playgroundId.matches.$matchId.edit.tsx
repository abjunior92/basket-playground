import { PrismaClient } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
} from '@remix-run/node'
import {
	Form,
	useActionData,
	useLoaderData,
	useLocation,
	useNavigation,
} from '@remix-run/react'
import { Ambulance, Minus, Pencil, Plus, Settings, Circle } from 'lucide-react'
import { useState } from 'react'
import invariant from 'tiny-invariant'
import ErrorMessage from '~/components/ErrorMessage'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
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
	const [teamFouls, setTeamFouls] = useState<Record<string, number>>({
		[match.team1Id]: 0,
		[match.team2Id]: 0,
	})

	const handleAliasChange = (playerId: string, newAlias: string) => {
		setTemporaryAliases((prev) => ({
			...prev,
			[playerId]: newAlias,
		}))
	}

	const handleFoulClick = (teamId: string, foulNumber: number) => {
		setTeamFouls((prev) => ({
			...prev,
			[teamId]: prev[teamId] === foulNumber ? foulNumber - 1 : foulNumber,
		}))
	}

	const renderFoulDots = (teamId: string) => {
		return Array.from({ length: 6 }, (_, i) => {
			const isFilled = (teamFouls[teamId] || 0) > i
			const isBonus = i === 5 && (teamFouls[teamId] || 0) === 6

			return (
				<button
					key={i}
					type="button"
					onClick={() => handleFoulClick(teamId, i + 1)}
					className={`transition-colors duration-200 ${
						isBonus
							? 'text-red-500 hover:text-red-600'
							: isFilled
								? 'text-black hover:text-gray-700'
								: 'text-black hover:text-gray-300'
					}`}
				>
					<Circle
						className={`h-5 w-5 md:h-6 md:w-6 ${
							isFilled ? 'fill-current' : ''
						} stroke-current`}
					/>
				</button>
			)
		})
	}

	const openAliasDialog = (playerId: string) => {
		setSelectedPlayerId(playerId)
		setAliasDialogOpen(true)
	}

	const timeSlots = getTimeSlots()

	const location = useLocation()

	const backLink =
		location.state?.backLink || `/playground/${match.playgroundId}/matches`

	return (
		<div className="md:p-4">
			<Header title="Modifica partita" backLink={backLink} icon={<Pencil />} />
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

						<div className="mt-4 flex justify-between">
							<div className="flex flex-col items-start">
								<span className="text-sm font-semibold">Falli di squadra</span>
								<div className="mt-2 flex items-center gap-x-1">
									{renderFoulDots(match.team1Id)}
								</div>
							</div>

							<div className="flex flex-col items-end">
								<span className="text-sm font-semibold">Falli di squadra</span>
								<div className="mt-2 flex items-center gap-x-1">
									{renderFoulDots(match.team2Id)}
								</div>
							</div>
						</div>

						<Separator className="mt-6 mb-4" />

						<div className="mb-4 flex w-full justify-center">
							<h4 className="text-xl font-bold">Punti giocatori</h4>
						</div>

						<div className="flex justify-between gap-x-4">
							<div className="flex flex-1 flex-col space-y-4 md:max-w-[25%]">
								{match.team1.players.map((player) => (
									<div key={player.id}>
										<label htmlFor={`player-${player.id}`}>
											<div className="border-input flex items-center justify-between rounded-t-lg border-x border-t bg-white px-2 py-1 leading-5 text-shadow-2xs">
												<div className="flex flex-col">
													<span className="text-xs">{player.name}</span>
													<span className="font-semibold">
														{player.surname}
													</span>
												</div>
												<div>
													{player.warnings === 1 && '🟨 '}
													{player.isExpelled && '🟥 '}
													{player.retired && <Ambulance className="h-4 w-4" />}
												</div>
											</div>
											<input
												hidden
												name={`team1Players[]`}
												defaultValue={player.id}
											/>
											<div className="border-input bg-muted flex flex-col space-y-2 rounded-b-lg border p-2">
												<span className="text-xs">
													<i>
														Alias:{' '}
														{temporaryAliases[player.id] || 'non impostato'}
													</i>
												</span>
												<div className="flex items-center justify-between gap-x-2">
													<Button
														variant="destructive"
														type="button"
														size="icon"
														aria-label="Sottrai"
														onClick={(e) => {
															e.preventDefault()
															const input = e.currentTarget
																.nextElementSibling as HTMLInputElement
															if (input) {
																const currentValue = parseInt(input.value) || 0
																input.value = Math.max(
																	0,
																	currentValue - 1,
																).toString()
															}
														}}
													>
														<Minus className="h-4 w-4" />
													</Button>
													<Input
														type="number"
														name={`player-${player.id}`}
														className="max-w-16 md:w-64"
														inputMode="numeric"
														min="0"
														defaultValue={playerStatsMap.get(player.id) ?? 0}
													/>
													<Button
														variant="success"
														type="button"
														size="icon"
														aria-label="Aggiungi"
														onClick={(e) => {
															e.preventDefault()
															const input = e.currentTarget
																.previousElementSibling as HTMLInputElement
															if (input) {
																const currentValue = parseInt(input.value) || 0
																input.value = Math.max(
																	0,
																	currentValue + 1,
																).toString()
															}
														}}
													>
														<Plus className="h-4 w-4" />
													</Button>
												</div>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="outline"
															type="button"
															aria-label="Opzioni"
														>
															<Settings className="h-4 w-4" />
															Opzioni
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent>
														<DropdownMenuItem>
															<Form
																method="post"
																action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/retire?matchId=${match.id}`}
																preventScrollReset
																className="w-full"
															>
																<Button
																	variant={
																		player.retired ? 'outline' : 'destructive'
																	}
																	type="submit"
																	disabled={
																		navigation.state === 'submitting' ||
																		navigation.state === 'loading'
																	}
																	aria-label={
																		player.retired
																			? 'Segna come disponibile'
																			: 'Segna come ritirato'
																	}
																	className="w-full"
																>
																	<Ambulance className="h-4 w-4" />
																	{player.retired
																		? 'Segna come disponibile'
																		: 'Segna come ritirato'}
																</Button>
															</Form>
														</DropdownMenuItem>
														{player.warnings < 2 && (
															<>
																<DropdownMenuSeparator />
																<DropdownMenuItem>
																	<Form
																		method="post"
																		action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/add-warning?matchId=${match.id}`}
																		preventScrollReset
																		className="w-full"
																	>
																		<Button
																			variant="warning"
																			type="submit"
																			aria-label="Aggiungi ammonizione"
																			className="w-full"
																			disabled={
																				navigation.state === 'submitting' ||
																				navigation.state === 'loading'
																			}
																		>
																			<Plus className="h-4 w-4" />
																			Aggiungi ammonizione
																		</Button>
																	</Form>
																</DropdownMenuItem>
															</>
														)}
														{player.warnings > 0 && (
															<>
																<DropdownMenuSeparator />
																<DropdownMenuItem>
																	<Form
																		method="post"
																		action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/remove-warning?matchId=${match.id}`}
																		preventScrollReset
																		className="w-full"
																	>
																		<Button
																			variant="secondary"
																			type="submit"
																			aria-label="Rimuovi ammonizione"
																			className="w-full"
																			disabled={
																				navigation.state === 'submitting' ||
																				navigation.state === 'loading'
																			}
																		>
																			<Minus className="h-4 w-4" />
																			Rimuovi ammonizione
																		</Button>
																	</Form>
																</DropdownMenuItem>
															</>
														)}
														{!player.isExpelled && (
															<>
																<DropdownMenuSeparator />
																<DropdownMenuItem>
																	<Form
																		method="post"
																		action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/add-expulsion?matchId=${match.id}`}
																		preventScrollReset
																		className="w-full"
																	>
																		<Button
																			variant="destructive"
																			type="submit"
																			aria-label="Espelli giocatore"
																			className="w-full"
																			disabled={
																				navigation.state === 'submitting' ||
																				navigation.state === 'loading'
																			}
																		>
																			<Plus className="h-4 w-4" />
																			Espelli giocatore
																		</Button>
																	</Form>
																</DropdownMenuItem>
															</>
														)}
														{player.isExpelled && (
															<>
																<DropdownMenuSeparator />
																<DropdownMenuItem>
																	<Form
																		method="post"
																		action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/remove-expulsion?matchId=${match.id}`}
																		preventScrollReset
																		className="w-full"
																	>
																		<Button
																			variant="secondary"
																			type="submit"
																			aria-label="Rimuovi espulsione"
																			className="w-full"
																			disabled={
																				navigation.state === 'submitting' ||
																				navigation.state === 'loading'
																			}
																		>
																			<Minus className="h-4 w-4" />
																			Rimuovi espulsione
																		</Button>
																	</Form>
																</DropdownMenuItem>
															</>
														)}
														<DropdownMenuItem
															onSelect={() => openAliasDialog(player.id)}
														>
															<Button variant="outline" className="w-full">
																Modifica Alias Temporaneo
															</Button>
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</label>
									</div>
								))}

								{actionData && 'errorTeam1' in actionData && (
									<ErrorMessage message={actionData.errorTeam1} />
								)}
							</div>
							<div className="flex flex-1 flex-col space-y-4 md:max-w-[25%]">
								{match.team2.players.map((player) => (
									<div key={player.id} className="">
										<label htmlFor={`player-${player.id}`}>
											<div className="border-input flex items-center justify-between rounded-t-lg border-x border-t bg-white px-2 py-1 leading-5 text-shadow-2xs">
												<div className="flex flex-col">
													<span className="text-xs">{player.name}</span>
													<span className="font-semibold">
														{player.surname}
													</span>
												</div>
												<div>
													{player.warnings === 1 && '🟨 '}
													{player.isExpelled && '🟥 '}
													{player.retired && <Ambulance className="h-4 w-4" />}
												</div>
											</div>
											<input
												hidden
												name={`team2Players[]`}
												defaultValue={player.id}
											/>
											<div className="border-input bg-muted flex flex-col space-y-2 rounded-b-lg border p-2">
												<span className="text-xs">
													<i>
														Alias:{' '}
														{temporaryAliases[player.id] || 'non impostato'}
													</i>
												</span>
												<div className="flex items-center justify-between gap-x-2">
													<Button
														variant="destructive"
														type="button"
														size="icon"
														aria-label="Sottrai"
														onClick={(e) => {
															e.preventDefault()
															const input = e.currentTarget
																.nextElementSibling as HTMLInputElement
															if (input) {
																const currentValue = parseInt(input.value) || 0
																input.value = Math.max(
																	0,
																	currentValue - 1,
																).toString()
															}
														}}
													>
														<Minus className="h-4 w-4" />
													</Button>
													<Input
														type="number"
														name={`player-${player.id}`}
														className="max-w-16 md:w-64"
														inputMode="numeric"
														min="0"
														defaultValue={playerStatsMap.get(player.id) ?? 0}
													/>
													<Button
														variant="success"
														type="button"
														size="icon"
														aria-label="Aggiungi"
														onClick={(e) => {
															e.preventDefault()
															const input = e.currentTarget
																.previousElementSibling as HTMLInputElement
															if (input) {
																const currentValue = parseInt(input.value) || 0
																input.value = Math.max(
																	0,
																	currentValue + 1,
																).toString()
															}
														}}
													>
														<Plus className="h-4 w-4" />
													</Button>
												</div>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="outline"
															type="button"
															aria-label="Opzioni"
														>
															<Settings className="h-4 w-4" />
															Opzioni
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent>
														<DropdownMenuItem>
															<Form
																method="post"
																action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/retire?matchId=${match.id}`}
																preventScrollReset
																className="w-full"
															>
																<Button
																	variant={
																		player.retired ? 'outline' : 'destructive'
																	}
																	type="submit"
																	aria-label={
																		player.retired
																			? 'Segna come disponibile'
																			: 'Segna come ritirato'
																	}
																	className="w-full"
																	disabled={
																		navigation.state === 'submitting' ||
																		navigation.state === 'loading'
																	}
																>
																	<Ambulance className="h-4 w-4" />
																	{player.retired
																		? 'Segna come disponibile'
																		: 'Segna come ritirato'}
																</Button>
															</Form>
														</DropdownMenuItem>
														{player.warnings < 2 && (
															<>
																<DropdownMenuSeparator />
																<DropdownMenuItem>
																	<Form
																		method="post"
																		action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/add-warning?matchId=${match.id}`}
																		preventScrollReset
																		className="w-full"
																	>
																		<Button
																			variant="warning"
																			type="submit"
																			aria-label="Aggiungi ammonizione"
																			className="w-full"
																			disabled={
																				navigation.state === 'submitting' ||
																				navigation.state === 'loading'
																			}
																		>
																			<Plus className="h-4 w-4" />
																			Aggiungi ammonizione
																		</Button>
																	</Form>
																</DropdownMenuItem>
															</>
														)}
														{player.warnings > 0 && (
															<>
																<DropdownMenuSeparator />
																<DropdownMenuItem>
																	<Form
																		method="post"
																		action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/remove-warning?matchId=${match.id}`}
																		preventScrollReset
																		className="w-full"
																	>
																		<Button
																			variant="secondary"
																			type="submit"
																			aria-label="Rimuovi ammonizione"
																			className="w-full"
																			disabled={
																				navigation.state === 'submitting' ||
																				navigation.state === 'loading'
																			}
																		>
																			<Minus className="h-4 w-4" />
																			Rimuovi ammonizione
																		</Button>
																	</Form>
																</DropdownMenuItem>
															</>
														)}
														{!player.isExpelled && (
															<>
																<DropdownMenuSeparator />
																<DropdownMenuItem>
																	<Form
																		method="post"
																		action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/add-expulsion?matchId=${match.id}`}
																		preventScrollReset
																		className="w-full"
																	>
																		<Button
																			variant="destructive"
																			type="submit"
																			aria-label="Espelli giocatore"
																			className="w-full"
																			disabled={
																				navigation.state === 'submitting' ||
																				navigation.state === 'loading'
																			}
																		>
																			<Plus className="h-4 w-4" />
																			Espelli giocatore
																		</Button>
																	</Form>
																</DropdownMenuItem>
															</>
														)}
														{player.isExpelled && (
															<>
																<DropdownMenuSeparator />
																<DropdownMenuItem>
																	<Form
																		method="post"
																		action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/remove-expulsion?matchId=${match.id}`}
																		preventScrollReset
																		className="w-full"
																	>
																		<Button
																			variant="secondary"
																			type="submit"
																			aria-label="Rimuovi espulsione"
																			className="w-full"
																			disabled={
																				navigation.state === 'submitting' ||
																				navigation.state === 'loading'
																			}
																		>
																			<Minus className="h-4 w-4" />
																			Rimuovi espulsione
																		</Button>
																	</Form>
																</DropdownMenuItem>
															</>
														)}
														<DropdownMenuItem
															onSelect={() => openAliasDialog(player.id)}
														>
															<Button variant="outline" className="w-full">
																Modifica Alias Temporaneo
															</Button>
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</label>
									</div>
								))}

								{actionData && 'errorTeam2' in actionData && (
									<ErrorMessage message={actionData.errorTeam2} />
								)}
							</div>
						</div>

						<input type="hidden" name="backLink" value={backLink} />

						<Button
							type="submit"
							name="intent"
							value="score"
							className="mt-8 w-full md:w-auto"
							disabled={
								(navigation.state === 'submitting' ||
									navigation.state === 'loading') &&
								navigation.formAction?.includes('edit')
							}
						>
							{(navigation.state === 'submitting' ||
								navigation.state === 'loading') &&
							navigation.formAction?.includes('edit')
								? 'Salvataggio...'
								: 'Salva'}
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
							disabled={
								navigation.state === 'submitting' ||
								navigation.state === 'loading'
							}
						>
							Ripianifica Partita
						</Button>
						{actionData && 'error' in actionData && (
							<p className="text-red-500">{actionData.error}</p>
						)}
					</Form>
				</TabsContent>
			</Tabs>

			<Dialog open={aliasDialogOpen} onOpenChange={setAliasDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Modifica Alias Temporaneo</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<Input
							type="text"
							placeholder="Inserisci alias temporaneo"
							value={
								selectedPlayerId ? temporaryAliases[selectedPlayerId] || '' : ''
							}
							onChange={(e) =>
								selectedPlayerId &&
								handleAliasChange(selectedPlayerId, e.target.value)
							}
						/>
						<Button onClick={() => setAliasDialogOpen(false)}>Chiudi</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
