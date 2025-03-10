import { PrismaClient } from '@prisma/client'
import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { User } from 'lucide-react'

const prisma = new PrismaClient()

export const loader = async () => {
	const playgrounds = await prisma.playground.findMany({
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

	return json(playgrounds)
}

export default function TournamentOverview() {
	const playgrounds = useLoaderData<typeof loader>()

	return (
		<div className="p-4">
			<h1 className="text-2xl font-bold">Panoramica Tornei</h1>

			{playgrounds.length === 0 ? (
				<p className="mt-4">Nessun torneo disponibile</p>
			) : (
				playgrounds.map((playground) => (
					<div
						key={playground.id}
						className="mt-6 rounded-lg border p-4 shadow-lg"
					>
						<h2 className="text-xl font-semibold">{playground.name}</h2>

						{playground.groups.length === 0 ? (
							<p className="mt-2">Nessun girone disponibile</p>
						) : (
							playground.groups.map((group) => (
								<div
									key={group.id}
									className="mt-4 border-l-2 border-gray-300 pl-4"
								>
									<h3 className="text-lg font-medium">{group.name}</h3>

									{group.teams.length === 0 ? (
										<p className="mt-2">Nessuna squadra in questo girone</p>
									) : (
										group.teams.map((team) => (
											<div
												key={team.id}
												className="mt-3 border-l-2 border-blue-300 pl-4"
											>
												<h4 className="text-md font-medium">{team.name}</h4>

												{team.players.length === 0 ? (
													<p className="mt-1 text-sm">
														Nessuno giocatore in questa squadra
													</p>
												) : (
													<ul className="mt-1 text-sm">
														{team.players.map((player) => (
															<li
																key={player.id}
																className="ml-2 flex items-center space-x-2"
															>
																<User className="inline-block h-4 w-4" />
																<span>
																	{player.name} {player.surname}
																</span>
															</li>
														))}
													</ul>
												)}
											</div>
										))
									)}
								</div>
							))
						)}
					</div>
				))
			)}
		</div>
	)
}
