import { PrismaClient } from '@prisma/client'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, Link, redirect, useLoaderData } from '@remix-run/react'
import { Pencil, Trophy, X } from 'lucide-react'
import invariant from 'tiny-invariant'
import DialogAlert from '~/components/DialogAlert'
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'

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

	if (!name) {
		return json({ error: 'Il nome del girone è obbligatorio' }, { status: 400 })
	}

	await prisma.group.create({
		data: {
			name,
			playgroundId: params.playgroundId,
		},
	})

	return redirect(`/playgrounds/${params.playgroundId}`)
}

export default function PlaygroundDetails() {
	const { playground } = useLoaderData<typeof loader>()

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
				<Button type="submit">Aggiungi Girone</Button>
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
										{group.name}
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
