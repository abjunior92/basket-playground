import { PrismaClient } from '@prisma/client'
import { json, type MetaFunction } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { Trophy, User } from 'lucide-react'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { colorGroupClasses } from '~/lib/types'
import { cn } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Panoramica Tornei' },
		{ name: 'description', content: 'Panoramica Tornei' },
	]
}

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
		<div className="md:p-4">
			<Header title="Panoramica Tornei" backLink="/" icon={<Trophy />} />

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
									<Badge
										className={cn(
											'mb-2 text-lg',
											colorGroupClasses[group.color],
										)}
									>
										{group.name}
									</Badge>

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
														Nessun giocatore in questa squadra
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
