import { PrismaClient } from '@prisma/client'
import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	redirect,
} from '@remix-run/node'
import { Form, useLoaderData, useNavigation, useParams } from '@remix-run/react'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
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

const prisma = new PrismaClient()

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const playgroundId = params.playgroundId

	const players = await prisma.player.findMany({
		where: { team: { group: { playgroundId } } },
		select: { id: true, name: true, surname: true },
	})

	return { players }
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const formData = await request.formData()
	const playerId = formData.get('playerId') as string | undefined
	const name = formData.get('name') as string
	const surname = formData.get('surname') as string
	const playgroundId = params.playgroundId

	const existingPlayer = await prisma.player.findUnique({
		where: { id: playerId },
	})

	let fee = 3
	let data

	if (existingPlayer) {
		fee = 1
		data = {
			playerId: existingPlayer.id,
			playgroundId,
			fee,
			name: existingPlayer.name,
			surname: existingPlayer.surname,
		}
	} else {
		data = { name, surname, playgroundId, fee }
	}

	await prisma.threePointChallengeParticipant.create({ data })

	return redirect(`/playground/${params.playgroundId}/three-points-challenge`)
}

export default function NewParticipant() {
	const { players } = useLoaderData<typeof loader>()
	const [selectedPlayer, setSelectedPlayer] = useState('')
	const [search, setSearch] = useState('')
	const navigation = useNavigation()
	const params = useParams()

	const filteredPlayers = players.filter(
		(player) =>
			player.name.toLowerCase().includes(search.toLowerCase()) ||
			player.surname.toLowerCase().includes(search.toLowerCase()),
	)

	return (
		<div className="container mx-auto p-4">
			<div className="mb-4">
				<Header
					title="Aggiungi Partecipante"
					backLink={`/playground/${params.playgroundId}/three-points-challenge`}
					icon={<UserPlus />}
				/>
			</div>
			<Form method="post" className="space-y-4">
				<div className="space-y-2">
					<label htmlFor="playerId">Seleziona un giocatore esistente:</label>
					<Select name="playerId" onValueChange={setSelectedPlayer}>
						<SelectTrigger id="playerId">
							<SelectValue placeholder="Seleziona un giocatore" />
						</SelectTrigger>
						<SelectContent>
							<Input
								type="text"
								name="search"
								placeholder="Cerca un giocatore..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								onKeyDown={(e) => e.stopPropagation()}
								className="sticky top-0 z-10"
							/>
							<SelectGroup>
								<SelectLabel>Giocatore</SelectLabel>
								{filteredPlayers.length > 0 ? (
									filteredPlayers.map((player) => (
										<SelectItem key={player.id} value={player.id}>
											{player.name} {player.surname}
										</SelectItem>
									))
								) : (
									<SelectItem value="x" disabled>
										Nessun giocatore trovato
									</SelectItem>
								)}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<label htmlFor="name">Oppure inserisci un nuovo giocatore:</label>
					<Input
						type="text"
						name="name"
						placeholder="Nome"
						disabled={selectedPlayer !== ''}
						required={selectedPlayer === ''}
					/>
					<Input
						type="text"
						name="surname"
						placeholder="Cognome"
						disabled={selectedPlayer !== ''}
						required={selectedPlayer === ''}
					/>
				</div>
				<Button
					className="w-full md:w-auto"
					type="submit"
					disabled={
						navigation.state === 'submitting' || navigation.state === 'loading'
					}
				>
					{navigation.state === 'submitting' || navigation.state === 'loading'
						? 'Iscrizione in corso...'
						: 'Iscrivi'}
				</Button>
			</Form>
		</div>
	)
}
