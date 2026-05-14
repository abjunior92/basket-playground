import { type Level, PrismaClient } from '@prisma/client'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	json,
	redirect,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	useActionData,
	useFetcher,
	useLoaderData,
	useLocation,
	useNavigation,
	useRevalidator,
} from '@remix-run/react'
import {
	Ambulance,
	Ellipsis,
	Minus,
	Pencil,
	Plus,
	ShieldUser,
	X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import invariant from 'tiny-invariant'
import DialogAlert from '~/components/DialogAlert'
import ErrorMessage from '~/components/ErrorMessage'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { useToast } from '~/hooks/use-toast'
import {
	playerLevelsMap,
	playerLevelsTransform,
	playerSizesMap,
	playerSizesTransform,
} from '~/lib/types'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [{ title: 'Squadra' }, { name: 'description', content: 'Squadra' }]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	invariant(params.teamId, 'teamId is required')
	const team = await prisma.team.findUnique({
		where: { id: params.teamId },
		include: {
			players: {
				orderBy: [{ surname: 'asc' }, { name: 'asc' }],
			},
		},
	})

	if (!team) throw new Response('Not Found', { status: 404 })

	return json({ team })
}

const MAX_PLAYERS_PER_TEAM = 5

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	invariant(params.teamId, 'teamId is required')
	const formData = await request.formData()
	const name = formData.get('name') as string
	const surname = formData.get('surname') as string
	const birthYear = parseInt(formData.get('birthYear') as string)
	const level = formData.get('level') as Level
	const paid = formData.get('paid') === 'on'

	const team = await prisma.team.findUnique({
		where: { id: params.teamId },
		include: { players: true },
	})

	if (
		team &&
		team.players.filter((p) => !p.retired).length >= MAX_PLAYERS_PER_TEAM
	) {
		return json(
			{
				error:
					'Questa squadra ha già raggiunto il limite massimo di 5 giocatori.',
			},
			{ status: 400 },
		)
	}

	const existingPlayer = await prisma.player.findFirst({
		where: {
			playgroundId: params.playgroundId,
			name,
			surname,
			teamId: params.teamId,
		},
	})

	if (existingPlayer) {
		return json({ error: 'Giocatore già esistente!' }, { status: 400 })
	}

	if (!name || !surname || !birthYear || !level) {
		return json(
			{ error: 'Compila tutti i campi correttamente!' },
			{ status: 400 },
		)
	}

	await prisma.player.create({
		data: {
			name,
			surname,
			birthYear,
			level,
			paid,
			teamId: params.teamId,
			playgroundId: params.playgroundId,
		},
	})

	return redirect(`/playgrounds/${params.playgroundId}/teams/${params.teamId}`)
}

export default function TeamDetails() {
	const { team } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const fetcher = useFetcher<{ ok: boolean } | { error: string }>()
	const revalidator = useRevalidator()
	const { toast } = useToast()
	const navigation = useNavigation()
	const [open, setOpen] = useState<string | null>(null)
	const location = useLocation()
	const isFull =
		team &&
		team.players.filter((p) => !p.retired).length >= MAX_PLAYERS_PER_TEAM

	useEffect(() => {
		if (fetcher.data === undefined || fetcher.data === null) {
			return
		}

		if ('ok' in fetcher.data) {
			setOpen(null)
			revalidator.revalidate()
		}

		if ('error' in fetcher.data) {
			toast({
				title: 'Errore',
				description: fetcher.data.error,
				variant: 'destructive',
			})
		}
		fetcher.submit('', { method: 'post', action: '/data/reset-fetcher' })
	}, [fetcher, revalidator, toast])

	return (
		<div className="mx-auto max-w-5xl space-y-6 p-4 pb-12 md:p-6">
			<div className="flex items-center justify-between gap-3">
				<Header
					title={team.name}
					backLink={
						location.state?.backLink ||
						`/playgrounds/${team.playgroundId}/groups/${team.groupId}`
					}
					icon={<ShieldUser />}
					home
				/>
				<Form
					id="deleteTeamForm"
					method="post"
					action={`/data/teams/${team.id}/${team.groupId}/${team.playgroundId}/delete`}
				>
					<DialogAlert
						trigger={
							<Button type="button" variant="destructive" className="shrink-0">
								<X className="h-5 w-5" />
								<span className="hidden md:inline">Cancella squadra</span>
							</Button>
						}
						title="Elimina squadra"
						description="Sei sicuro di voler eliminare questa squadra?"
						formId="deleteTeamForm"
					/>
				</Form>
			</div>

			<section className="section-blur">
				<p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
					Crea
				</p>
				<h2 className="mt-1 text-lg font-bold text-slate-900">
					Nuovo giocatore
				</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-700">
					Al massimo cinque giocatori attivi per squadra. Campi obbligatori:
					nome, cognome, anno di nascita e livello.
				</p>
			</section>

			<section className="section-blur space-y-4">
				<Form method="post" className="space-y-4">
					<Input type="text" name="name" placeholder="Nome" required />
					<Input type="text" name="surname" placeholder="Cognome" required />
					<Input
						type="text"
						name="birthYear"
						placeholder="Anno di nascita"
						required
					/>
					<Select name="level" required>
						<SelectTrigger>
							<SelectValue placeholder="Livello di esperienza" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Livello</SelectLabel>
								{Array.from(playerLevelsMap.entries()).map(([key, value]) => (
									<SelectItem key={key} value={key}>
										{value}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					<div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2">
						<Checkbox name="paid" id="new-player-paid" />
						<label
							htmlFor="new-player-paid"
							className="text-sm leading-snug text-slate-700"
						>
							Iscrizione pagata
						</label>
					</div>
					<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
						<Button
							type="submit"
							className="w-full sm:w-auto"
							disabled={
								isFull ||
								((navigation.state === 'submitting' ||
									navigation.state === 'loading') &&
									navigation.formAction?.includes('playgrounds'))
							}
						>
							{(navigation.state === 'submitting' ||
								navigation.state === 'loading') &&
							navigation.formAction?.includes('playgrounds')
								? 'Aggiunta in corso…'
								: 'Aggiungi giocatore'}
						</Button>
						{isFull && <ErrorMessage message="Squadra piena" />}
						{actionData?.error && <ErrorMessage message={actionData.error} />}
					</div>
				</Form>
			</section>

			<section className="section-blur">
				<p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
					Elenco
				</p>
				<h2 className="mt-1 text-lg font-bold text-slate-900">Rosa</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-700">
					Modifica dati anagrafici, taglia e pagamento; dal menu azioni gestisci
					ammonizioni, espulsioni e ritiri.
				</p>
			</section>

			<div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/50 shadow-inner ring-1 ring-slate-900/5">
				<Table className="w-full min-w-[920px] border-collapse text-sm">
					<TableHeader>
						<TableRow className="border-b border-slate-200/80 bg-slate-50/90 hover:bg-slate-50/90">
							<TableHead className="text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
								Nome
							</TableHead>
							<TableHead className="text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
								Cognome
							</TableHead>
							<TableHead className="text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
								Anno
							</TableHead>
							<TableHead className="text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
								Livello
							</TableHead>
							<TableHead className="text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
								Pagato
							</TableHead>
							<TableHead className="text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
								Taglia
							</TableHead>
							<TableHead className="text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
								Amm.
							</TableHead>
							<TableHead className="text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
								Esp.
							</TableHead>
							<TableHead className="text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
								Rit.
							</TableHead>
							<TableHead className="text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
								Modifica
							</TableHead>
							<TableHead className="text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
								Elimina
							</TableHead>
							<TableHead className="text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
								Altro
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{team.players.map((player) => (
							<TableRow
								key={player.id}
								className="border-slate-200/80 bg-white/80 text-center hover:bg-slate-50/80"
							>
								<TableCell>{player.name}</TableCell>
								<TableCell>{player.surname}</TableCell>
								<TableCell>{player.birthYear}</TableCell>
								<TableCell>{playerLevelsTransform[player.level]}</TableCell>
								<TableCell>{player.paid ? '✅' : '❌'}</TableCell>
								<TableCell>
									{player.size ? playerSizesTransform[player.size] : '-'}
								</TableCell>
								<TableCell>
									{player.warnings === 0
										? '-'
										: player.warnings === 1
											? '🟨'
											: '🟨 🟨'}
								</TableCell>
								<TableCell>{player.isExpelled ? '🟥' : '-'}</TableCell>
								<TableCell>{player.retired ? '🚑' : '-'}</TableCell>
								<TableCell>
									<Dialog
										open={open === player.id}
										onOpenChange={() =>
											setOpen(open === player.id ? null : player.id)
										}
									>
										<DialogTrigger asChild>
											<Button
												variant="outline"
												size="icon"
												type="button"
												aria-label="Modifica giocatore"
												className="border-slate-200 bg-white/80 shadow-sm"
											>
												<Pencil className="h-4 w-4" />
											</Button>
										</DialogTrigger>
										<DialogContent className="sm:max-w-[425px]">
											<DialogHeader>
												<DialogTitle>Modifica giocatore</DialogTitle>
												<DialogDescription>
													Modifica i dati del giocatore {player.name}{' '}
													{player.surname}.
												</DialogDescription>
											</DialogHeader>
											<div className="grid gap-4 py-4">
												<Input
													form="editPlayerForm"
													type="text"
													name="name"
													placeholder="Nome"
													defaultValue={player.name}
													required
												/>
												<Input
													form="editPlayerForm"
													type="text"
													name="surname"
													placeholder="Cognome"
													defaultValue={player.surname}
													required
												/>
												<Input
													form="editPlayerForm"
													type="text"
													name="birthYear"
													placeholder="Anno di nascita"
													defaultValue={player.birthYear}
													required
												/>
												<Select
													form="editPlayerForm"
													name="level"
													defaultValue={player.level}
													required
												>
													<SelectTrigger>
														<SelectValue placeholder="Livello" />
													</SelectTrigger>
													<SelectContent>
														<SelectGroup>
															<SelectLabel>Livello</SelectLabel>
															{Array.from(playerLevelsMap.entries()).map(
																([key, value]) => (
																	<SelectItem key={key} value={key}>
																		{value}
																	</SelectItem>
																),
															)}
														</SelectGroup>
													</SelectContent>
												</Select>
												<Select
													form="editPlayerForm"
													name="size"
													defaultValue={player.size ?? undefined}
												>
													<SelectTrigger>
														<SelectValue placeholder="Taglia" />
													</SelectTrigger>
													<SelectContent>
														<SelectGroup>
															<SelectLabel>Taglia</SelectLabel>
															<SelectItem value="__none__">
																Nessuna taglia
															</SelectItem>
															{Array.from(playerSizesMap.entries()).map(
																([key, value]) => (
																	<SelectItem key={key} value={key}>
																		{value}
																	</SelectItem>
																),
															)}
														</SelectGroup>
													</SelectContent>
												</Select>
												<div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2">
													<Checkbox
														form="editPlayerForm"
														name="paid"
														id={`edit-paid-${player.id}`}
														defaultChecked={player.paid}
													/>
													<label
														htmlFor={`edit-paid-${player.id}`}
														className="text-sm leading-snug text-slate-700"
													>
														Iscrizione pagata
													</label>
												</div>
											</div>
											<DialogFooter>
												<fetcher.Form
													id="editPlayerForm"
													method="post"
													noValidate
													action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/edit`}
												>
													<Button
														type="submit"
														className="w-full md:w-auto"
														disabled={
															fetcher.state === 'submitting' ||
															fetcher.state === 'loading'
														}
													>
														{fetcher.state === 'submitting' ||
														fetcher.state === 'loading'
															? 'Salvataggio...'
															: 'Salva'}
													</Button>
												</fetcher.Form>
											</DialogFooter>
										</DialogContent>
									</Dialog>
								</TableCell>
								<TableCell>
									<Form
										id={`deletePlayerForm-${player.id}`}
										method="post"
										action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/delete`}
									>
										<DialogAlert
											trigger={
												<Button
													variant="destructive"
													size="icon"
													type="button"
													aria-label="Elimina giocatore"
													className="shadow-sm"
												>
													<X className="h-4 w-4" />
												</Button>
											}
											title="Elimina giocatore"
											description="<b>Sei sicuro di voler eliminare questo giocatore?</b> <br />Questa operazione rimuoverà la taglia assegnata al giocatore e ripristinerà la disponibilità della taglia nello stock"
											formId={`deletePlayerForm-${player.id}`}
										/>
									</Form>
								</TableCell>
								<TableCell>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												type="button"
												aria-label="Altre azioni"
												className="text-slate-600 hover:bg-slate-100 hover:text-slate-900"
											>
												<Ellipsis className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent>
											<DropdownMenuItem>
												<Form
													method="post"
													action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/retire`}
													className="w-full"
												>
													<Button
														variant={player.retired ? 'outline' : 'destructive'}
														type="submit"
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
															action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/add-warning`}
															className="w-full"
														>
															<Button
																variant="warning"
																type="submit"
																aria-label="Aggiungi ammonizione"
																className="w-full"
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
															action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/remove-warning`}
															className="w-full"
														>
															<Button
																variant="secondary"
																type="submit"
																aria-label="Rimuovi ammonizione"
																className="w-full"
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
															action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/add-expulsion`}
															className="w-full"
														>
															<Button
																variant="destructive"
																type="submit"
																aria-label="Espelli giocatore"
																className="w-full"
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
															action={`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/remove-expulsion`}
															className="w-full"
														>
															<Button
																variant="secondary"
																type="submit"
																aria-label="Rimuovi espulsione"
																className="w-full"
															>
																<Minus className="h-4 w-4" />
																Rimuovi espulsione
															</Button>
														</Form>
													</DropdownMenuItem>
												</>
											)}
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
