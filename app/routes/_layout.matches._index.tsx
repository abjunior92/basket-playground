import { PrismaClient } from '@prisma/client'
import { json, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { CalendarRange, Pencil } from 'lucide-react'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { cn } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Calendario Partite' },
		{ name: 'description', content: 'Calendario Partite' },
	]
}

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
		<div className="md:p-4">
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
					<div className="overflow-hidden rounded-lg border border-gray-300">
						<Table className="w-full border-collapse">
							<TableHeader>
								<TableRow className="bg-gray-100">
									<TableHead>⏱️ Orario</TableHead>
									<TableHead>📍 Campo</TableHead>
									<TableHead>👥 Squadra 1</TableHead>
									<TableHead>👥 Squadra 2</TableHead>
									<TableHead>📝 Risultato</TableHead>
									<TableHead></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{matchesByDay[Number(day)]?.map((match) => {
									const isTeam1Winner = match.winner === match.team1Id
									const isTeam2Winner = match.winner === match.team2Id
									return (
										<TableRow key={match.id} className="text-center">
											<TableCell>{match.timeSlot}</TableCell>
											<TableCell>{match.field}</TableCell>
											<TableCell>
												<div className="flex flex-col">
													<span>
														{isTeam1Winner && '🏆 '}
														{match.team1.name}
													</span>
													<span className="text-xs">
														{match.team1.group.name}
													</span>
												</div>
											</TableCell>
											<TableCell>
												<div className="flex flex-col">
													<span>
														{isTeam2Winner && '🏆 '}
														{match.team2.name}
													</span>
													<span className="text-xs">
														{match.team2.group.name}
													</span>
												</div>
											</TableCell>
											<TableCell>
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
											</TableCell>
											<TableCell>
												<Button asChild variant="outline">
													<Link to={`/matches/${match.id}/edit`}>
														<Pencil />
													</Link>
												</Button>
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</div>
				</div>
			))}
		</div>
	)
}
