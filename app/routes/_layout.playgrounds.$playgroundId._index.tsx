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
import { Pencil, Trophy, X } from 'lucide-react'
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
				include: {
					teams: {
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
		<div className="md:p-4">
			<div className="flex items-center justify-between">
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
							<Button type="button" variant="destructive">
								<X className="h-5 w-5" />
								<span className="hidden md:block">Cancella Torneo</span>
							</Button>
						}
						title="Elimina torneo"
						description="Sei sicuro di voler eliminare questo torneo?"
						formId="deletePlaygroundForm"
					/>
				</Form>
			</div>

			<h4 className="mt-4 text-xl">Nuovo Girone</h4>
			<Form method="post" className="mt-2 space-y-4">
				<Input
					type="text"
					name="name"
					placeholder="Inserisci il nome del girone"
					required
				/>
				<Select name="color" required>
					<SelectTrigger>
						<SelectValue placeholder="Seleziona il colore del girone" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectLabel>Colore gruppo</SelectLabel>
							{Array.from(colorGroupMap.entries()).map(([key]) => (
								<SelectItem key={key} value={key}>
									<div className="flex items-center space-x-2">
										<div
											className={cn(
												'h-4 w-24 rounded-full border border-gray-200',
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
				<div className="flex items-center gap-x-2">
					<Button type="submit">Aggiungi Girone</Button>
					{actionData?.error && <ErrorMessage message={actionData.error} />}
				</div>
			</Form>

			<h2 className="mt-12 text-xl">Lista Gironi</h2>

			<div className="mt-4 overflow-hidden rounded-lg border border-gray-300">
				<Table className="w-full border-collapse">
					<TableHeader>
						<TableRow className="bg-gray-100">
							<TableHead>Nome</TableHead>
							<TableHead>Squadre</TableHead>
							<TableHead>Modifica</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{playground.groups.map((group) => (
							<TableRow key={group.id}>
								<TableCell className="text-center">
									<Link
										to={`/playgrounds/${playground.id}/groups/${group.id}`}
										className="text-blue-500"
									>
										<Badge className={colorGroupClasses[group.color]}>
											{group.name}
										</Badge>
									</Link>
								</TableCell>
								<TableCell>
									{group.teams.map((team) => team.name).join(', ')}
								</TableCell>
								<TableCell className="text-center">
									<Dialog>
										<DialogTrigger asChild>
											<Button
												variant="outline"
												type="button"
												aria-label="Modifica giocatore"
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
													form="editGroupForm"
													type="text"
													name="name"
													placeholder="Inserisci il nome del girone"
													defaultValue={group.name}
													required
												/>
											</div>
											<DialogFooter>
												<Form
													id="editGroupForm"
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
		</div>
	)
}
