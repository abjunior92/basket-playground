import { PrismaClient } from '@prisma/client'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	json,
	redirect,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { Pencil, ShieldUser, X } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
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
import { type PlayerLevels, playerLevelsMap } from '~/lib/types'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [{ title: 'Squadra' }, { name: 'description', content: 'Squadra' }]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	const team = await prisma.team.findUnique({
		where: { id: params.teamId },
		include: { players: true },
	})

	if (!team) throw new Response('Not Found', { status: 404 })

	return json({ team })
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.teamId, 'teamId is required')
	const formData = await request.formData()
	const name = formData.get('name') as string
	const surname = formData.get('surname') as string

	const birthYear = parseInt(formData.get('birthYear') as string)
	const level = formData.get('level') as PlayerLevels
	const paid = formData.get('paid') === 'on'

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
		},
	})

	return redirect(`/teams/${params.teamId}`)
}

export default function TeamDetails() {
	const { team } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	return (
		<div className="p-4">
			<div className="flex items-center justify-between">
				<Header
					title={team.name}
					backLink={`/groups/${team.groupId}`}
					icon={<ShieldUser />}
					home
				/>

				<Form
					method="post"
					action={`/data/teams/${team.id}/${team.groupId}/delete`}
				>
					<Button
						type="submit"
						variant="destructive"
						onClick={() =>
							confirm('Sei sicuro di voler eliminare questa squadra?')
						}
					>
						Cancella Squadra
					</Button>
				</Form>
			</div>

			<h4 className="mt-4 text-xl">Nuovo Giocatore</h4>
			<Form method="post" className="mt-2 space-y-4">
				<Input
					type="text"
					name="name"
					placeholder="Inserisci il nome del giocatore"
					required
				/>
				<Input
					type="text"
					name="surname"
					placeholder="Inserisci il cognome del giocatore"
					required
				/>
				<Input
					type="text"
					name="birthYear"
					placeholder="Inserisci l'anno di nascita del giocatore"
					required
				/>
				<Select name="level" required>
					<SelectTrigger>
						<SelectValue placeholder="Seleziona un livello di esperienza" />
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
				<div className="flex items-center space-x-2">
					<Checkbox name="paid" />
					<label
						htmlFor="paid"
						className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						Iscrizione pagata
					</label>
				</div>
				<Button type="submit">Aggiungi Giocatore</Button>
				{actionData?.error && (
					<p className="text-red-500">{actionData.error}</p>
				)}
			</Form>

			<h2 className="mt-12 text-xl">Lista Giocatori</h2>

			<div className="mt-4 overflow-hidden rounded-lg border border-gray-300">
				<Table className="w-full border-collapse">
					<TableHeader>
						<TableRow className="bg-gray-100">
							<TableHead>Nome</TableHead>
							<TableHead>Cognome</TableHead>
							<TableHead>Anno</TableHead>
							<TableHead>Livello</TableHead>
							<TableHead>Pagato</TableHead>
							<TableHead>Punti totali</TableHead>
							<TableHead>Modifica</TableHead>
							<TableHead>Elimina</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{team.players.map((player) => (
							<TableRow key={player.id} className="text-center">
								<TableCell>{player.name}</TableCell>
								<TableCell>{player.surname}</TableCell>
								<TableCell>{player.birthYear}</TableCell>
								<TableCell>{player.level.replace('_', ' ')}</TableCell>
								<TableCell>{player.paid ? '✅' : '❌'}</TableCell>
								<TableCell>{player.totalPoints}</TableCell>
								<TableCell>
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
													placeholder="Inserisci il nome del giocatore"
													defaultValue={player.name}
													required
												/>
												<Input
													form="editPlayerForm"
													type="text"
													name="surname"
													placeholder="Inserisci il cognome del giocatore"
													defaultValue={player.surname}
													required
												/>
												<Input
													form="editPlayerForm"
													type="text"
													name="birthYear"
													placeholder="Inserisci l'anno di nascita del giocatore"
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
														<SelectValue placeholder="Seleziona un livello di esperienza" />
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
												<div className="flex items-center space-x-2">
													<Checkbox
														form="editPlayerForm"
														name="paid"
														defaultChecked={player.paid}
													/>
													<label
														htmlFor="paid"
														className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
													>
														Iscrizione pagata
													</label>
												</div>
											</div>
											<DialogFooter>
												<Form
													id="editPlayerForm"
													method="post"
													action={`/data/players/${player.id}/${player.teamId}/edit`}
												>
													<DialogClose>
														<Button type="submit">Salva</Button>
													</DialogClose>
												</Form>
											</DialogFooter>
										</DialogContent>
									</Dialog>
								</TableCell>
								<TableCell>
									<Form
										method="post"
										action={`/data/players/${player.id}/${player.teamId}/delete`}
										className="flex items-center justify-center"
									>
										<Button
											type="submit"
											variant="destructive"
											onClick={() =>
												confirm(
													'Sei sicuro di voler eliminare questo giocatore?',
												)
											}
										>
											<X className="h-4 w-4" />
										</Button>
									</Form>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
