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
import {
	Ambulance,
	Minus,
	Pencil,
	Plus,
	Settings,
	Circle,
	CircleAlert,
} from 'lucide-react'
import { useState } from 'react'
import invariant from 'tiny-invariant'
import ErrorMessage from '~/components/ErrorMessage'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { cn, getDayLabel, getTimeSlots } from '~/lib/utils'

const prisma = new PrismaClient()

/** Input punteggio squadra (tabellone) */
const SCORE_INPUT_CLASS =
	'h-12 w-full rounded-xl border-slate-200 bg-white text-center text-2xl font-bold tabular-nums shadow-inner focus-visible:border-orange-300 focus-visible:ring-2 focus-visible:ring-orange-400/40 sm:h-14 sm:text-3xl sm:max-w-48 md:h-16 md:text-4xl font-mono'

/** Input punti singolo giocatore */
const PLAYER_POINTS_INPUT_CLASS =
	'min-h-10 h-10 w-full min-w-0 flex-1 basis-0 rounded-xl border-slate-200 bg-white px-1 text-center text-xl font-bold tabular-nums shadow-inner focus-visible:ring-2 focus-visible:ring-orange-400/40 sm:min-h-12 sm:h-12 sm:px-2 sm:text-xl md:text-2xl font-mono'

const PLANNER_SELECT_CLASS =
	'border-slate-200 bg-white/90 shadow-inner focus-visible:ring-orange-400/40'

/** +/− punti giocatore: compatti su mobile per lasciare spazio all'input */
const PLAYER_STEP_BTN_CLASS =
	'h-8 w-8 min-h-8 min-w-8 shrink-0 touch-manipulation rounded-lg p-0 shadow-sm sm:h-11 sm:w-11 sm:min-h-11 sm:min-w-11 sm:rounded-xl'

const PLAYER_STEP_ICON_CLASS = 'h-3.5 w-3.5 sm:h-4 sm:w-4'

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
					className={cn(
						'rounded-full p-px transition-colors duration-200 active:scale-95 md:p-1',
						isBonus
							? 'text-red-600 hover:bg-red-50 hover:text-red-700'
							: isFilled
								? 'text-slate-800 hover:bg-orange-50 hover:text-orange-800'
								: 'text-slate-300 hover:bg-slate-100 hover:text-slate-500',
					)}
				>
					<Circle
						className={cn(
							'h-5 w-5 md:h-6 md:w-6',
							isFilled ? 'fill-current' : '',
							'stroke-current',
						)}
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
					<Form method="post" className="space-y-5">
						<section className="section-blur space-y-6">
							<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-x-2 gap-y-3 sm:gap-x-4 sm:gap-y-2">
								<div className="min-w-0 text-left">
									<p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase sm:text-xs">
										Squadra 1
									</p>
									<p className="mt-0.5 line-clamp-2 text-sm leading-tight font-bold text-slate-900 sm:mt-1 sm:text-lg">
										{match.team1.name}
									</p>
									<label className="mt-2 block sm:mt-3">
										<input hidden name="team1Id" defaultValue={match.team1Id} />
										<Input
											type="number"
											name="score1"
											defaultValue={match.score1 ?? 0}
											className={SCORE_INPUT_CLASS}
											inputMode="numeric"
											required
										/>
									</label>
								</div>

								<div className="flex shrink-0 flex-col justify-end pb-1 sm:pb-2">
									<span className="rounded-full border border-slate-200/80 bg-slate-900/4 px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-slate-600 sm:px-4 sm:py-2 sm:text-sm">
										VS
									</span>
								</div>

								<div className="min-w-0 text-right">
									<p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase sm:text-xs">
										Squadra 2
									</p>
									<p className="mt-0.5 line-clamp-2 text-sm leading-tight font-bold text-slate-900 sm:mt-1 sm:text-lg">
										{match.team2.name}
									</p>
									<label className="mt-2 block sm:mt-3 sm:ml-auto sm:max-w-48">
										<input hidden name="team2Id" defaultValue={match.team2Id} />
										<Input
											type="number"
											name="score2"
											defaultValue={match.score2 ?? 0}
											className={SCORE_INPUT_CLASS}
											inputMode="numeric"
											required
										/>
									</label>
								</div>
							</div>

							<div className="grid grid-cols-2 border-t border-slate-200/80 pt-4 sm:pt-6">
								<div className="flex min-w-0 flex-col items-start">
									<span className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase sm:text-xs">
										Falli squadra
									</span>
									<div className="mt-2 flex max-w-full flex-wrap gap-0.5">
										{renderFoulDots(match.team1Id)}
									</div>
								</div>

								<div className="flex min-w-0 flex-col items-end border-l border-slate-200/70">
									<span className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase sm:text-xs">
										Falli squadra
									</span>
									<div className="mt-2 flex max-w-full flex-wrap justify-end gap-0.5">
										{renderFoulDots(match.team2Id)}
									</div>
								</div>
							</div>
						</section>

						<div className="grid grid-cols-2 md:gap-y-8">
							<div className="min-w-0 space-y-4 border-r border-slate-200/80 pr-2 sm:pr-4">
								{match.team1.players.map((player) => (
									<div
										key={player.id}
										className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5"
									>
										<label
											htmlFor={`player-${player.id}`}
											className="block cursor-pointer"
										>
											<div className="flex items-center justify-between gap-1.5 border-b border-slate-200/80 bg-linear-to-r from-slate-50/90 to-white px-2 py-2 sm:gap-2 sm:px-3 sm:py-2.5">
												<div className="flex flex-col">
													<span className="text-[11px] leading-tight text-slate-600 sm:text-xs">
														{player.name}
													</span>
													<span className="text-sm leading-tight font-semibold text-slate-900 sm:text-base">
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
											<div className="flex flex-col gap-2 rounded-b-2xl border border-t-0 border-slate-200/80 bg-slate-50/60 p-2 sm:gap-3 sm:p-3">
												<p className="text-xs leading-relaxed text-slate-600">
													<span className="font-medium text-slate-700">
														Alias:
													</span>{' '}
													{temporaryAliases[player.id] || 'non impostato'}
												</p>
												<div className="flex min-w-0 items-center gap-1 sm:gap-2">
													<Button
														variant="destructive"
														type="button"
														size="icon"
														aria-label="Sottrai"
														className={PLAYER_STEP_BTN_CLASS}
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
														<Minus className={PLAYER_STEP_ICON_CLASS} />
													</Button>
													<Input
														type="number"
														name={`player-${player.id}`}
														className={PLAYER_POINTS_INPUT_CLASS}
														inputMode="numeric"
														min="0"
														defaultValue={playerStatsMap.get(player.id) ?? 0}
													/>
													<Button
														variant="success"
														type="button"
														size="icon"
														aria-label="Aggiungi"
														className={PLAYER_STEP_BTN_CLASS}
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
														<Plus className={PLAYER_STEP_ICON_CLASS} />
													</Button>
												</div>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="outline"
															type="button"
															aria-label="Opzioni"
															className="w-full border-slate-200 bg-white/90 text-slate-700 shadow-sm"
														>
															<Settings className="h-4 w-4 shrink-0" />
															<span className="ml-2">Opzioni</span>
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
							<div className="min-w-0 space-y-4 pl-2 sm:pl-4">
								{match.team2.players.map((player) => (
									<div
										key={player.id}
										className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5"
									>
										<label
											htmlFor={`player-${player.id}`}
											className="block cursor-pointer"
										>
											<div className="flex items-center justify-between gap-1.5 border-b border-slate-200/80 bg-linear-to-r from-slate-50/90 to-white px-2 py-2 sm:gap-2 sm:px-3 sm:py-2.5">
												<div className="flex flex-col">
													<span className="text-[11px] leading-tight text-slate-600 sm:text-xs">
														{player.name}
													</span>
													<span className="text-sm leading-tight font-semibold text-slate-900 sm:text-base">
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
											<div className="flex flex-col gap-2 rounded-b-2xl border border-t-0 border-slate-200/80 bg-slate-50/60 p-2 sm:gap-3 sm:p-3">
												<p className="text-xs leading-relaxed text-slate-600">
													<span className="font-medium text-slate-700">
														Alias:
													</span>{' '}
													{temporaryAliases[player.id] || 'non impostato'}
												</p>
												<div className="flex min-w-0 items-center gap-1 sm:gap-2">
													<Button
														variant="destructive"
														type="button"
														size="icon"
														aria-label="Sottrai"
														className={PLAYER_STEP_BTN_CLASS}
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
														<Minus className={PLAYER_STEP_ICON_CLASS} />
													</Button>
													<Input
														type="number"
														name={`player-${player.id}`}
														className={PLAYER_POINTS_INPUT_CLASS}
														inputMode="numeric"
														min="0"
														defaultValue={playerStatsMap.get(player.id) ?? 0}
													/>
													<Button
														variant="success"
														type="button"
														size="icon"
														aria-label="Aggiungi"
														className={PLAYER_STEP_BTN_CLASS}
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
														<Plus className={PLAYER_STEP_ICON_CLASS} />
													</Button>
												</div>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="outline"
															type="button"
															aria-label="Opzioni"
															className="w-full border-slate-200 bg-white/90 text-slate-700 shadow-sm"
														>
															<Settings className="h-4 w-4 shrink-0" />
															<span className="ml-2">Opzioni</span>
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

						<section className="section-blur space-y-4">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
									<Checkbox
										id="isWalkover"
										name="isWalkover"
										className="mt-0.5"
									/>
									<label
										htmlFor="isWalkover"
										className="cursor-pointer text-sm leading-snug text-slate-800"
									>
										<span className="font-semibold">Vittoria a tavolino</span>
										<span className="mt-1 block text-xs font-normal text-slate-600">
											Consente di salvare senza controllo sui punti giocatori;
											imposta di solito il risultato a 10-0.
										</span>
									</label>
								</div>

								<div className="flex items-start gap-1">
									<CircleAlert className="h-4 w-4 shrink-0 text-red-500" />
									<span className="block text-xs font-normal text-slate-600">
										<strong>Prima di salvare:</strong> somma i punti giocatori,
										inserisci il risultato e fai un check con il segnapunti.
									</span>
								</div>

								<Button
									type="submit"
									name="intent"
									value="score"
									className="h-12 w-full shrink-0 text-base font-semibold shadow-md sm:h-11 sm:w-auto sm:min-w-40"
									disabled={
										(navigation.state === 'submitting' ||
											navigation.state === 'loading') &&
										navigation.formAction?.includes('edit')
									}
								>
									{(navigation.state === 'submitting' ||
										navigation.state === 'loading') &&
									navigation.formAction?.includes('edit')
										? 'Salvataggio…'
										: 'Salva risultato'}
								</Button>
							</div>
						</section>
					</Form>
				</TabsContent>
				<TabsContent
					value="planner"
					className="mt-4 w-full min-w-0 focus-visible:outline-none"
				>
					<section className="section-blur">
						<h2 className="text-lg font-bold text-slate-900">
							Ripianifica partita
						</h2>
						<p className="mt-2 text-sm leading-relaxed text-slate-700">
							Sposta giorno, orario, campo o accoppiata squadre. Non è possibile
							se è già stato inserito un risultato.
						</p>
					</section>

					<Form
						method="post"
						className="mt-5 grid w-full grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-5"
					>
						<input type="hidden" name="backLink" value={backLink} />
						<div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-inner ring-1 ring-slate-900/5 sm:p-5">
							<label
								htmlFor="day"
								className="text-xs font-semibold tracking-wide text-slate-600 uppercase"
							>
								Giorno
							</label>
							<Select name="day" defaultValue={`${match.day}`}>
								<SelectTrigger
									id="day"
									className={cn('mt-2', PLANNER_SELECT_CLASS)}
								>
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

						<div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-inner ring-1 ring-slate-900/5 sm:p-5">
							<label
								htmlFor="timeSlot"
								className="text-xs font-semibold tracking-wide text-slate-600 uppercase"
							>
								Orario
							</label>
							<Select name="timeSlot" defaultValue={match.timeSlot}>
								<SelectTrigger
									id="timeSlot"
									className={cn('mt-2', PLANNER_SELECT_CLASS)}
								>
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

						<div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-inner ring-1 ring-slate-900/5 sm:p-5">
							<label
								htmlFor="field"
								className="text-xs font-semibold tracking-wide text-slate-600 uppercase"
							>
								Campo
							</label>
							<Select name="field" defaultValue={match.field}>
								<SelectTrigger
									id="field"
									className={cn('mt-2', PLANNER_SELECT_CLASS)}
								>
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

						<div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-inner ring-1 ring-slate-900/5 sm:p-5">
							<label
								htmlFor="team1Id"
								className="text-xs font-semibold tracking-wide text-slate-600 uppercase"
							>
								Squadra 1
							</label>
							<Select name="team1Id" defaultValue={match.team1Id}>
								<SelectTrigger
									id="team1Id"
									className={cn('mt-2', PLANNER_SELECT_CLASS)}
								>
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

						<div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-inner ring-1 ring-slate-900/5 sm:p-5">
							<label
								htmlFor="team2Id"
								className="text-xs font-semibold tracking-wide text-slate-600 uppercase"
							>
								Squadra 2
							</label>
							<Select name="team2Id" defaultValue={match.team2Id}>
								<SelectTrigger
									id="team2Id"
									className={cn('mt-2', PLANNER_SELECT_CLASS)}
								>
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
							className="h-11 w-full font-semibold md:col-span-2 md:w-auto md:justify-self-start"
							disabled={
								navigation.state === 'submitting' ||
								navigation.state === 'loading'
							}
						>
							Ripianifica partita
						</Button>
						{actionData && 'error' in actionData && (
							<div className="md:col-span-2">
								<ErrorMessage message={actionData.error} />
							</div>
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
							placeholder="Alias temporaneo"
							className="border-slate-200 bg-white/90 shadow-inner focus-visible:ring-orange-400/40"
							value={
								selectedPlayerId ? temporaryAliases[selectedPlayerId] || '' : ''
							}
							onChange={(e) =>
								selectedPlayerId &&
								handleAliasChange(selectedPlayerId, e.target.value)
							}
						/>
						<Button type="button" onClick={() => setAliasDialogOpen(false)}>
							Chiudi
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
