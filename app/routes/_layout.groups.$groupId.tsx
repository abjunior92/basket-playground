import { PrismaClient } from '@prisma/client'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	json,
	redirect,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, Link, useLoaderData } from '@remix-run/react'
import { LayoutGrid, Pencil } from 'lucide-react'
import invariant from 'tiny-invariant'
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
	return [{ title: 'Girone' }, { name: 'description', content: 'Girone' }]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	const group = await prisma.group.findUnique({
		where: { id: params.groupId },
		include: {
			teams: {
				include: {
					players: true,
				},
			},
		},
	})

	if (!group) throw new Response('Not Found', { status: 404 })

	return json({ group })
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.groupId, 'groupId is required')
	const formData = await request.formData()
	const name = formData.get('name') as string

	if (!name) {
		return json(
			{ error: 'Il nome della squadra è obbligatorio' },
			{ status: 400 },
		)
	}

	await prisma.team.create({
		data: {
			name,
			groupId: params.groupId,
		},
	})

	return redirect(`/groups/${params.groupId}`)
}

export default function GroupDetails() {
	const { group } = useLoaderData<typeof loader>()

	return (
		<div className="p-4">
			<div className="flex items-center justify-between">
				<Header
					title={group.name}
					backLink={`/playgrounds/${group.playgroundId}`}
					icon={<LayoutGrid />}
					home
				/>
				<Form
					method="post"
					action={`/data/groups/${group.id}/${group.playgroundId}/delete`}
				>
					<Button
						type="submit"
						variant="destructive"
						onClick={() =>
							confirm('Sei sicuro di voler eliminare questo girone?')
						}
					>
						Cancella Girone
					</Button>
				</Form>
			</div>

			<h4 className="mt-4 text-xl">Nuova Squadra</h4>
			<Form method="post" className="mt-2 space-y-4">
				<Input
					type="text"
					name="name"
					placeholder="Inserisci il nome della squadra"
					required
				/>
				<Button type="submit">Aggiungi Squadra</Button>
			</Form>

			<h2 className="mt-12 text-xl">Lista Squadre</h2>

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
						{group.teams.map((team) => (
							<TableRow key={team.id}>
								<TableCell className="text-center">
									<Link to={`/teams/${team.id}`} className="text-blue-500">
										{team.name}
									</Link>
								</TableCell>
								<TableCell>
									{team.players
										.map((player) => `${player.name} ${player.surname}`)
										.join(', ')}
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
												<DialogTitle>Modifica squadra</DialogTitle>
											</DialogHeader>
											<div className="grid gap-4 py-4">
												<Input
													form="editTeamForm"
													type="text"
													name="name"
													placeholder="Inserisci il nome della squadra"
													defaultValue={team.name}
													required
												/>
											</div>
											<DialogFooter>
												<Form
													id="editTeamForm"
													method="post"
													action={`/data/teams/${team.id}/${group.id}/edit`}
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
