import { PrismaClient } from '@prisma/client'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	json,
	redirect,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react'
import { LayoutGrid, Pencil, X } from 'lucide-react'
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
				include: {
					players: true,
				},
			},
		},
	})

	if (!group) throw new Response('Not Found', { status: 404 })

	const groups = await prisma.group.findMany({
		where: { playgroundId: params.playgroundId },
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

export default function GroupDetails() {
	const { group, groups } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	return (
		<div className="md:p-4">
			<div className="flex items-center justify-between">
				<Header
					title={group.name}
					backLink={`/playgrounds/${group.playgroundId}`}
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
							<Button type="button" variant="destructive">
								<X className="h-5 w-5" />
								<span className="hidden md:block">Cancella Girone</span>
							</Button>
						}
						title="Elimina girone"
						description="Sei sicuro di voler eliminare questo girone?"
						formId="deleteGroupForm"
					/>
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
				<Input
					type="tel"
					name="refPhoneNumber"
					placeholder="Inserisci il numero di telefono di riferimento della squadra"
				/>
				<div className="flex items-center gap-x-2">
					<Button type="submit">Aggiungi Squadra</Button>
					{actionData?.error && <ErrorMessage message={actionData.error} />}
				</div>
			</Form>

			<h2 className="mt-12 text-xl">Lista Squadre</h2>

			<div className="mt-4 overflow-hidden rounded-lg border border-gray-300">
				<Table className="w-full border-collapse">
					<TableHeader>
						<TableRow className="bg-gray-100">
							<TableHead>Nome</TableHead>
							<TableHead>Squadre</TableHead>
							<TableHead>Telefono riferimento</TableHead>
							<TableHead>Modifica</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{group.teams.map((team) => (
							<TableRow key={team.id}>
								<TableCell className="text-center">
									<Link
										to={`/playgrounds/${group.playgroundId}/teams/${team.id}`}
										className="text-blue-500 underline underline-offset-6"
									>
										{team.name}
									</Link>
								</TableCell>
								<TableCell>
									{team.players
										.map((player) => `${player.name} ${player.surname}`)
										.join(', ')}
								</TableCell>
								<TableCell className="text-center">
									{team.refPhoneNumber}
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
													form={`editTeamForm-${team.id}`}
													type="text"
													name="name"
													placeholder="Inserisci il nome della squadra"
													defaultValue={team.name}
													required
												/>
												<Input
													form={`editTeamForm-${team.id}`}
													type="tel"
													name="refPhoneNumber"
													placeholder="Inserisci il numero di telefono di riferimento della squadra"
													defaultValue={team.refPhoneNumber ?? ''}
												/>
												<Select
													form={`editTeamForm-${team.id}`}
													name="groupId"
													defaultValue={team.groupId}
													required
												>
													<SelectTrigger>
														<SelectValue placeholder="Seleziona il girone" />
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
		</div>
	)
}
