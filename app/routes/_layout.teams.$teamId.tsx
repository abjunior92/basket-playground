import { PrismaClient } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	redirect,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { ShieldHalf, XCircle } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

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

	if (!name || !surname) {
		return json(
			{ error: 'Nome e cognome del giocatore sono obbligatori' },
			{ status: 400 },
		)
	}

	await prisma.player.create({
		data: {
			name,
			surname,
			teamId: params.teamId,
		},
	})

	return redirect(`/teams/${params.teamId}`)
}

export default function TeamDetails() {
	const { team } = useLoaderData<typeof loader>()

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
				/>
				<Input
					type="text"
					name="surname"
					placeholder="Inserisci il cognome del giocatore"
				/>
				<Button type="submit">Aggiungi Giocatore</Button>
			</Form>

			<h2 className="mt-12 text-xl">Lista Giocatori</h2>
			<ul className="mt-2">
				{team.players.map((player) => (
					<Form
						key={player.id}
						method="post"
						action={`/data/players/${player.id}/${player.teamId}/delete`}
						className="flex max-w-xs items-center justify-between"
					>
						<li className="list-inside list-decimal">
							{player.name} {player.surname}
						</li>
						<Button
							type="submit"
							variant="link"
							onClick={() =>
								confirm('Sei sicuro di voler eliminare questo giocatore?')
							}
						>
							<XCircle className="h-4 w-4 text-red-500" />
						</Button>
					</Form>
				))}
			</ul>
		</div>
	)
}
