import { PrismaClient } from '@prisma/client'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	json,
	redirect,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
	useLocation,
} from '@remix-run/react'
import { ChevronRight, LayoutGrid, Pencil, X } from 'lucide-react'
import invariant from 'tiny-invariant'
import DialogAlert from '~/components/DialogAlert'
import ErrorMessage from '~/components/ErrorMessage'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '~/components/ui/dialog'
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
import { cn } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [{ title: 'Girone' }, { name: 'description', content: 'Girone' }]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	invariant(params.groupId, 'groupId is required')
	const group = await prisma.group.findUnique({
		where: { id: params.groupId },
		include: {
			teams: {
				orderBy: { name: 'asc' },
				include: {
					players: {
						orderBy: [{ surname: 'asc' }, { name: 'asc' }],
					},
				},
			},
		},
	})

	if (!group) throw new Response('Not Found', { status: 404 })

	const groups = await prisma.group.findMany({
		where: { playgroundId: params.playgroundId },
		orderBy: { name: 'asc' },
	})

	return json({ group, groups })
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	invariant(params.groupId, 'groupId is required')
	const formData = await request.formData()
	const name = formData.get('name') as string
	const refPhoneNumber = formData.get('refPhoneNumber') as string

	const existingTeam = await prisma.team.findFirst({
		where: {
			playgroundId: params.playgroundId,
			name,
			groupId: params.groupId,
		},
	})

	if (existingTeam) {
		return json({ error: 'Squadra già esistente!' }, { status: 400 })
	}

	if (!name) {
		return json(
			{ error: 'Il nome della squadra è obbligatorio' },
			{ status: 400 },
		)
	}

	await prisma.team.create({
		data: {
			name,
			refPhoneNumber,
			groupId: params.groupId,
			playgroundId: params.playgroundId,
		},
	})

	return redirect(
		`/playgrounds/${params.playgroundId}/groups/${params.groupId}`,
	)
}

function resolveGroupBackLink(playgroundId: string, state: unknown): string {
	const candidate = (state as { backLink?: unknown } | null)?.backLink
	if (typeof candidate !== 'string' || !candidate.startsWith('/')) {
		return `/playgrounds/${playgroundId}`
	}
	const ownPlaygrounds = `/playgrounds/${playgroundId}`
	const ownPlayground = `/playground/${playgroundId}`
	if (
		candidate === ownPlaygrounds ||
		candidate.startsWith(`${ownPlaygrounds}/`) ||
		candidate.startsWith(`${ownPlayground}/`)
	) {
		return candidate
	}
	return ownPlaygrounds
}

export default function GroupDetails() {
	const { group, groups } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const location = useLocation()
	const backLink = resolveGroupBackLink(group.playgroundId, location.state)

	return (
		<div className="mx-auto max-w-5xl space-y-6 p-4 pb-12 md:p-6">
			<div className="flex items-center justify-between gap-3">
				<Header
					title={group.name}
					backLink={backLink}
					icon={<LayoutGrid />}
					home
				/>
				<Form
					id="deleteGroupForm"
					method="post"
					action={`/data/groups/${group.id}/${group.playgroundId}/delete`}
				>
					<DialogAlert
						trigger={
							<Button type="button" variant="destructive" className="shrink-0">
								<X className="h-5 w-5" />
								<span className="hidden md:inline">Cancella girone</span>
							</Button>
						}
						title="Elimina girone"
						description="Sei sicuro di voler eliminare questo girone?"
						formId="deleteGroupForm"
					/>
				</Form>
			</div>

			<section className="section-blur">
				<p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
					Crea
				</p>
				<h2 className="mt-1 text-lg font-bold text-slate-900">Nuova squadra</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-700">
					Inserisci il nome e, se serve, un recapito telefonico per il referente
					della squadra.
				</p>
			</section>

			<section className="section-blur space-y-4">
				<Form method="post" className="space-y-4">
					<Input
						type="text"
						name="name"
						placeholder="Nome della squadra"
						required
					/>
					<Input
						type="tel"
						name="refPhoneNumber"
						placeholder="Telefono di riferimento (opzionale)"
					/>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Button type="submit" className="w-full sm:w-auto">
							Aggiungi squadra
						</Button>
						{actionData?.error && <ErrorMessage message={actionData.error} />}
					</div>
				</Form>
			</section>

			<section className="section-blur">
				<p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
					Elenco
				</p>
				<h2 className="mt-1 text-lg font-bold text-slate-900">
					Squadre del girone
				</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-700">
					Apri una squadra per gestire giocatori, taglie e sanzioni. Puoi
					spostare una squadra in un altro girone dalla finestra di modifica.
				</p>
			</section>

			{group.teams.length === 0 ? (
				<section className="section-blur">
					<p className="text-sm text-slate-700">
						Non risultano ancora squadre in questo girone.
					</p>
				</section>
			) : (
				<div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/50 shadow-inner ring-1 ring-slate-900/5">
					<Table className="w-full min-w-[640px] border-collapse text-sm">
						<TableHeader>
							<TableRow className="border-b border-slate-200/80 bg-slate-50/90 hover:bg-slate-50/90">
								<TableHead className="text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">
									Squadra
								</TableHead>
								<TableHead className="text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">
									Giocatori
								</TableHead>
								<TableHead className="text-center text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
									Telefono
								</TableHead>
								<TableHead className="w-[1%] text-center text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
									Azioni
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{group.teams.map((team) => (
								<TableRow
									key={team.id}
									className="border-slate-200/80 bg-white/80 hover:bg-slate-50/80"
								>
									<TableCell className="align-middle">
										<Link
											to={`/playgrounds/${group.playgroundId}/teams/${team.id}`}
											className={cn(
												'group inline-flex max-w-full items-center gap-2 py-1 font-semibold text-slate-900 transition-colors hover:text-orange-900',
												'focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:outline-none',
											)}
										>
											<ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-600" />
											<span className="truncate">{team.name}</span>
										</Link>
									</TableCell>
									<TableCell className="max-w-md text-slate-700">
										<span className="line-clamp-2">
											{team.players.length === 0
												? '—'
												: team.players
														.map((p) => `${p.name} ${p.surname}`)
														.join(', ')}
										</span>
									</TableCell>
									<TableCell className="text-center whitespace-nowrap text-slate-600">
										{team.refPhoneNumber ?? '—'}
									</TableCell>
									<TableCell className="text-center">
										<Dialog>
											<DialogTrigger asChild>
												<Button
													variant="outline"
													type="button"
													size="sm"
													aria-label="Modifica squadra"
													className="border-slate-200 bg-white/80 shadow-sm"
												>
													<Pencil className="h-4 w-4" />
												</Button>
											</DialogTrigger>
											<DialogContent>
												<DialogHeader>
													<DialogTitle>Modifica squadra</DialogTitle>
												</DialogHeader>
												<div className="grid gap-4 py-4">
													<Input
														form={`editTeamForm-${team.id}`}
														type="text"
														name="name"
														placeholder="Nome della squadra"
														defaultValue={team.name}
														required
													/>
													<Input
														form={`editTeamForm-${team.id}`}
														type="tel"
														name="refPhoneNumber"
														placeholder="Telefono di riferimento"
														defaultValue={team.refPhoneNumber ?? ''}
													/>
													<Select
														form={`editTeamForm-${team.id}`}
														name="groupId"
														defaultValue={team.groupId}
														required
													>
														<SelectTrigger className="border-slate-300 bg-white">
															<SelectValue placeholder="Girone" />
														</SelectTrigger>
														<SelectContent>
															<SelectGroup>
																<SelectLabel>Girone</SelectLabel>
																{groups.map((g) => (
																	<SelectItem key={g.id} value={g.id}>
																		{g.name}
																	</SelectItem>
																))}
															</SelectGroup>
														</SelectContent>
													</Select>
												</div>
												<DialogFooter>
													<Form
														id={`editTeamForm-${team.id}`}
														method="post"
														action={`/data/teams/${team.id}/${group.id}/${group.playgroundId}/edit`}
													>
														<DialogClose>
															<Button type="submit">Salva</Button>
														</DialogClose>
													</Form>
												</DialogFooter>
											</DialogContent>
										</Dialog>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	)
}
