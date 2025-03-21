import { PrismaClient } from '@prisma/client'
import {
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import { Link, useLoaderData, useParams } from '@remix-run/react'
import { CalendarRange, Pencil, Plus } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
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

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const matches = await prisma.match.findMany({
		where: {
			playgroundId: params.playgroundId,
		},
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

	// Raggruppiamo le partite per giorno
	const matchesByDay = matches.reduce(
		(acc, match) => {
			acc[match.day] = acc[match.day] || []
			acc[match.day]?.push(match)
			return acc
		},
		{} as Record<number, typeof matches>,
	)

	return json({ matchesByDay })
}

export default function Matches() {
	const { matchesByDay } = useLoaderData<typeof loader>()
	const params = useParams()

	return (
		<div className="md:p-4">
			<div className="mb-4 flex items-center justify-between">
				<Header
					title="Calendario Partite"
					backLink={`/playground/${params.playgroundId}`}
					icon={<CalendarRange />}
				/>

				<Button asChild>
					<Link to={`/playground/${params.playgroundId}/matches/new`}>
						<Plus className="h-5 w-5" />
						<span className="hidden md:block">Aggiungi Partita</span>
					</Link>
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
												<div className="flex flex-col items-center justify-center">
													<span>
														{isTeam1Winner && '🏆 '}
														{match.team1.name}
													</span>
													<Badge variant={'secondary'}>
														{match.team1.group.name}
													</Badge>
												</div>
											</TableCell>
											<TableCell>
												<div className="flex flex-col items-center justify-center">
													<span>
														{isTeam2Winner && '🏆 '}
														{match.team2.name}
													</span>
													<Badge variant={'secondary'}>
														{match.team2.group.name}
													</Badge>
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
													<Link
														to={`/playground/${params.playgroundId}/matches/${match.id}/edit`}
													>
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
