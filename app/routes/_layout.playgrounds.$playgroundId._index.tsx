import { type ColorGroup, PrismaClient } from '@prisma/client'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	Link,
	redirect,
	useActionData,
	useLoaderData,
} from '@remix-run/react'
import { ChevronRight, Pencil, Trophy, X } from 'lucide-react'
import invariant from 'tiny-invariant'
import DialogAlert from '~/components/DialogAlert'
import ErrorMessage from '~/components/ErrorMessage'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
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
import {
	colorGroupClasses,
	colorGroupMap,
	colorGroupTransform,
} from '~/lib/types'
import { cn } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [{ title: 'Torneo' }, { name: 'description', content: 'Torneo' }]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const playground = await prisma.playground.findUnique({
		where: { id: params.playgroundId },
		include: {
			groups: {
				orderBy: { name: 'asc' },
				include: {
					teams: {
						orderBy: { name: 'asc' },
						include: {
							players: true,
						},
					},
				},
			},
		},
	})

	if (!playground) throw new Response('Not Found', { status: 404 })

	return json({ playground })
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const formData = await request.formData()
	const name = formData.get('name') as string
	const color = formData.get('color') as ColorGroup

	const existingGroup = await prisma.group.findFirst({
		where: {
			playgroundId: params.playgroundId,
			name,
		},
	})

	if (existingGroup) {
		return json({ error: 'Girone già esistente!' }, { status: 400 })
	}

	if (!name || !color) {
		return json(
			{ error: 'Il nome e il colore del girone sono obbligatori' },
			{ status: 400 },
		)
	}

	await prisma.group.create({
		data: {
			name,
			color,
			playgroundId: params.playgroundId,
		},
	})

	return redirect(`/playgrounds/${params.playgroundId}`)
}

export default function PlaygroundDetails() {
	const { playground } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	return (
		<div className="mx-auto max-w-5xl space-y-6 p-4 pb-12 md:p-6">
			<div className="flex items-center justify-between gap-3">
				<Header
					title={playground.name}
					backLink="/playgrounds"
					icon={<Trophy />}
					home
				/>
				<Form
					id="deletePlaygroundForm"
					method="post"
					action={`/data/playgrounds/${playground.id}/delete`}
				>
					<DialogAlert
						trigger={
							<Button type="button" variant="destructive" className="shrink-0">
								<X className="h-5 w-5" />
								<span className="hidden md:inline">Cancella torneo</span>
							</Button>
						}
						title="Elimina torneo"
						description="Sei sicuro di voler eliminare questo torneo?"
						formId="deletePlaygroundForm"
					/>
				</Form>
			</div>

			<section className="section-blur">
				<p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
					Crea
				</p>
				<h2 className="mt-1 text-lg font-bold text-slate-900">Nuovo girone</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-700">
					Assegna un nome e un colore distintivo: il colore viene usato nelle
					etichette e nelle viste pubbliche del torneo.
				</p>
			</section>

			<section className="section-blur space-y-4">
				<Form method="post" className="space-y-4">
					<Input
						type="text"
						name="name"
						placeholder="Nome del girone"
						required
					/>
					<Select name="color" required>
						<SelectTrigger>
							<SelectValue placeholder="Colore del girone" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Colore gruppo</SelectLabel>
								{Array.from(colorGroupMap.entries()).map(([key]) => (
									<SelectItem key={key} value={key}>
										<div className="flex items-center space-x-2">
											<div
												className={cn(
													'h-4 w-24 rounded-full border border-slate-200',
													colorGroupClasses[key],
												)}
											/>
											<span>{colorGroupTransform[key]}</span>
										</div>
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Button type="submit" className="w-full sm:w-auto">
							Aggiungi girone
						</Button>
						{actionData?.error && <ErrorMessage message={actionData.error} />}
					</div>
				</Form>
			</section>

			<section className="section-blur">
				<p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
					Elenco
				</p>
				<h2 className="mt-1 text-lg font-bold text-slate-900">Gironi</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-700">
					Tocca il nome del girone per aprirne la gestione (squadre e rose).
				</p>
			</section>

			{playground.groups.length === 0 ? (
				<section className="section-blur">
					<p className="text-sm text-slate-700">
						Non è ancora stato creato alcun girone per questo torneo.
					</p>
				</section>
			) : (
				<div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/50 shadow-inner ring-1 ring-slate-900/5">
					<Table className="w-full min-w-[520px] border-collapse text-sm">
						<TableHeader>
							<TableRow className="border-b border-slate-200/80 bg-slate-50/90 hover:bg-slate-50/90">
								<TableHead className="text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">
									Girone
								</TableHead>
								<TableHead className="text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">
									Squadre
								</TableHead>
								<TableHead className="w-[1%] text-center text-xs font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
									Azioni
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{playground.groups.map((group) => (
								<TableRow
									key={group.id}
									className="border-slate-200/80 bg-white/80 hover:bg-slate-50/80"
								>
									<TableCell className="align-middle">
										<Link
											to={`/playgrounds/${playground.id}/groups/${group.id}`}
											className={cn(
												'group inline-flex max-w-full items-center gap-2 rounded-lg py-1',
												'focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:outline-none',
											)}
										>
											<ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-600" />
											<Badge
												className={cn(
													'max-w-full truncate border border-white/40 text-xs font-medium text-white shadow-sm',
													colorGroupClasses[group.color],
												)}
											>
												{group.name}
											</Badge>
										</Link>
									</TableCell>
									<TableCell className="max-w-md text-slate-700">
										<span className="line-clamp-2">
											{group.teams.length === 0
												? '—'
												: group.teams.map((team) => team.name).join(', ')}
										</span>
									</TableCell>
									<TableCell className="text-center">
										<Dialog>
											<DialogTrigger asChild>
												<Button
													variant="outline"
													type="button"
													size="sm"
													aria-label="Modifica girone"
													className="border-slate-200 bg-white/80 shadow-sm"
												>
													<Pencil className="h-4 w-4" />
												</Button>
											</DialogTrigger>
											<DialogContent>
												<DialogHeader>
													<DialogTitle>Modifica girone</DialogTitle>
												</DialogHeader>
												<div className="grid gap-4 py-4">
													<Input
														form={`editGroupForm-${group.id}`}
														type="text"
														name="name"
														placeholder="Nome del girone"
														defaultValue={group.name}
														required
													/>
												</div>
												<DialogFooter>
													<Form
														id={`editGroupForm-${group.id}`}
														method="post"
														action={`/data/groups/${group.id}/${group.playgroundId}/edit`}
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
