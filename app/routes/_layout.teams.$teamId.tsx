import { PrismaClient } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	redirect,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { Pencil, ShieldHalf, X } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
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
import { type PlayerLevels, playerLevelsMap } from '~/lib/types'

const prisma = new PrismaClient()

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
					icon={<ShieldHalf />}
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
			<ul className="mt-2">
				{team.players.map((player) => (
					<Form
						key={player.id}
						method="post"
						action={`/data/players/${player.id}/${player.teamId}/delete`}
						className="flex items-center justify-between space-y-2"
					>
						<li className="list-inside list-decimal space-x-2">
							<span>
								{player.name} {player.surname}
							</span>
							<span>|</span>
							<span>{player.birthYear}</span>
							<span>|</span>
							<span>{player.level.replace('_', ' ')}</span>
							<span>|</span>
							<span>{player.paid ? '✅ Pagato' : '❌ Non pagato'}</span>
							<span>|</span>
							<span>punti: {player.totalPoints}</span>
						</li>
						<div className="flex items-center space-x-2">
							<Button
								type="submit"
								variant="destructive"
								onClick={() =>
									confirm('Sei sicuro di voler eliminare questo giocatore?')
								}
							>
								<X className="h-4 w-4" />
							</Button>
							<Button variant="secondary" type="button">
								<Pencil className="h-4 w-4" />
							</Button>
						</div>
					</Form>
				))}
			</ul>
		</div>
	)
}
