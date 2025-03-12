import { PrismaClient } from '@prisma/client'
import { json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { CalendarRange, Pencil } from 'lucide-react'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

const prisma = new PrismaClient()

export async function loader() {
	const matches = await prisma.match.findMany({
		include: {
			team1: {
				include: {
					group: true,
				},
			},
			team2: {
				include: {
					group: true,
				},
			},
		},
		orderBy: [{ day: 'asc' }, { timeSlot: 'asc' }],
	})

	return json(matches)
}

export default function Matches() {
	const matches = useLoaderData<typeof loader>()

	// Raggruppiamo le partite per giorno
	const matchesByDay = matches.reduce(
		(acc, match) => {
			acc[match.day] = acc[match.day] || []
			acc[match.day]?.push(match)
			return acc
		},
		{} as Record<number, typeof matches>,
	)

	return (
		<div className="container mx-auto p-4">
			<div className="mb-4 flex items-center justify-between">
				<Header
					title="Calendario Partite"
					backLink="/"
					icon={<CalendarRange />}
				/>

				<Button asChild>
					<Link to="/matches/new">Aggiungi Partita</Link>
				</Button>
			</div>
			{Object.keys(matchesByDay).map((day) => (
				<div key={day} className="mb-6">
					<h2 className="mb-2 text-xl font-semibold">Giorno {day}</h2>
					<table className="w-full border-collapse border border-gray-300">
						<thead>
							<tr className="bg-gray-100">
								<th className="border p-2">⏱️ Orario</th>
								<th className="border p-2">📍 Campo</th>
								<th className="border p-2">👥 Squadra 1</th>
								<th className="border p-2">👥 Squadra 2</th>
								<th className="border p-2">📝 Risultato</th>
								<th className="border p-2"></th>
							</tr>
						</thead>
						<tbody>
							{matchesByDay[Number(day)]?.map((match) => {
								const isTeam1Winner = (match.score1 || 0) > (match.score2 || 0)
								const isTeam2Winner = (match.score2 || 0) > (match.score1 || 0)
								return (
									<tr key={match.id} className="border-t text-center">
										<td className="border p-2">{match.timeSlot}</td>
										<td className="border p-2">{match.field}</td>
										<td className="border p-2">
											<div className="flex flex-col">
												<span>
													{isTeam1Winner && '🏆 '}
													{match.team1.name}
												</span>
												<span className="text-xs">
													{match.team1.group.name}
												</span>
											</div>
										</td>
										<td className="border p-2">
											<div className="flex flex-col">
												<span>
													{isTeam2Winner && '🏆 '}
													{match.team2.name}
												</span>
												<span className="text-xs">
													{match.team2.group.name}
												</span>
											</div>
										</td>
										<td className="border p-2">
											<span
												className={cn(
													isTeam1Winner && 'font-bold text-green-600',
												)}
											>
												{match.score1}
											</span>{' '}
											-{' '}
											<span
												className={cn(
													isTeam2Winner && 'font-bold text-green-600',
												)}
											>
												{match.score2}
											</span>
										</td>
										<td className="border p-2">
											<Button asChild variant="outline">
												<Link to={`/matches/${match.id}/edit`}>
													<Pencil />
												</Link>
											</Button>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			))}
		</div>
	)
}
