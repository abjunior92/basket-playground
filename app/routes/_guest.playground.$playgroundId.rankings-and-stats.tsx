import { type ColorGroup, PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { Medal } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { colorGroupClasses, type TeamWithStatsType } from '~/lib/types'
import { cn } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Classifiche' },
		{ name: 'description', content: 'Classifiche' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const teams = await prisma.team.findMany({
		where: { group: { playgroundId: params.playgroundId } },
		include: {
			group: true,
			matchesAsTeam1: {
				select: { id: true, winner: true, score1: true, score2: true },
			},
			matchesAsTeam2: {
				select: { id: true, winner: true, score1: true, score2: true },
			},
		},
	})

	const topPlayers = await prisma.player.findMany({
		orderBy: { totalPoints: 'desc' },
		include: { team: { include: { group: true } } },
		take: 10,
	})

	// Raggruppiamo le squadre per girone
	const groups = teams.reduce(
		(acc, team) => {
			const matches = [...team.matchesAsTeam1, ...team.matchesAsTeam2]

			const matchesPlayed = matches.filter(
				(match) => match.winner !== null,
			).length
			const matchesWon = matches.filter(
				(match) => match.winner === team.id,
			).length

			// Calcolo della differenza punti
			let pointsScored = 0
			let pointsConceded = 0

			matches.forEach((match) => {
				if (match.winner !== null) {
					if (team.matchesAsTeam1.some((m) => m.id === match.id)) {
						pointsScored += match.score1 || 0
						pointsConceded += match.score2 || 0
					} else {
						pointsScored += match.score2 || 0
						pointsConceded += match.score1 || 0
					}
				}
			})

			const pointsDifference = pointsScored - pointsConceded
			const winPercentage = matchesPlayed > 0 ? matchesWon / matchesPlayed : 0

			const teamData = {
				id: team.id,
				name: team.name,
				matchesPlayed,
				matchesWon,
				pointsScored,
				pointsConceded,
				winPercentage,
				pointsDifference,
				pointsGroup: matchesWon * 2,
			}

			if (!acc[`${team.group.name}_${team.group.color}`]) {
				acc[`${team.group.name}_${team.group.color}`] = []
			}

			acc[`${team.group.name}_${team.group.color}`]?.push(teamData)
			return acc
		},
		{} as Record<string, TeamWithStatsType[]>,
	)

	// Ordiniamo le squadre di ogni girone per percentuale vittorie e, successivamente, per differenza punti
	Object.keys(groups).forEach((groupName) => {
		groups[groupName]?.sort((a, b) => {
			if (b?.winPercentage !== a?.winPercentage) {
				return b.winPercentage - a.winPercentage
			}
			return b.pointsDifference - a.pointsDifference
		})
	})

	return { groups, topPlayers }
}

export default function Standings() {
	const { topPlayers, groups } = useLoaderData<typeof loader>()

	return (
		<div className="md:p-4">
			<Header title="Classifiche" icon={<Medal />} />
			<Tabs defaultValue="groups" className="mt-4 w-full">
				<TabsList>
					<TabsTrigger value="groups">Classifica Gironi</TabsTrigger>
					<TabsTrigger value="players">Classifica Giocatori</TabsTrigger>
				</TabsList>

				<TabsContent value="groups">
					{Object.entries(groups).map(([groupName, teams]) => {
						const [name, color] = groupName.split('_')
						return (
							<div key={groupName} className="mt-4">
								<Badge
									className={cn(
										'mb-2 text-lg',
										colorGroupClasses[color as ColorGroup],
									)}
								>
									{name}
								</Badge>
								<div className="overflow-hidden rounded-lg border border-gray-300">
									<Table className="w-full border-collapse">
										<TableHeader>
											<TableRow className="bg-gray-100">
												<TableHead>Nome squadra</TableHead>
												<TableHead>Punti girone</TableHead>
												<TableHead>Partite vinte</TableHead>
												<TableHead>Partite giocate</TableHead>
												<TableHead>Punti fatti</TableHead>
												<TableHead>Punti subiti</TableHead>
												<TableHead>%</TableHead>
												<TableHead>+/-</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{teams.map((team) => {
												return (
													<TableRow key={team.id} className="text-center">
														<TableCell>{team.name}</TableCell>
														<TableCell>{team.pointsGroup}</TableCell>
														<TableCell>{team.matchesWon}</TableCell>
														<TableCell>{team.matchesPlayed}</TableCell>
														<TableCell>{team.pointsScored}</TableCell>
														<TableCell>{team.pointsConceded}</TableCell>
														<TableCell>{team.winPercentage}</TableCell>
														<TableCell>{team.pointsDifference}</TableCell>
													</TableRow>
												)
											})}
										</TableBody>
									</Table>
								</div>
							</div>
						)
					})}
				</TabsContent>

				<TabsContent value="players">
					<div className="mt-4 overflow-hidden rounded-lg border border-gray-300">
						<Table className="w-full border-collapse">
							<TableHeader>
								<TableRow className="bg-gray-100">
									<TableHead>Nome Cognome</TableHead>
									<TableHead>Squadra</TableHead>
									<TableHead>Girone</TableHead>
									<TableHead>Punti totali</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{topPlayers.map((player) => (
									<TableRow
										key={player.id}
										className={cn('text-center', {
											'bg-red-500/20': player.isExpelled,
											'hover:bg-red-500/30': player.isExpelled,
											'bg-yellow-500/20': player.warnings === 1,
											'hover:bg-yellow-500/30': player.warnings === 1,
										})}
									>
										<TableCell>
											{player.name} {player.surname}
										</TableCell>
										<TableCell>{player.team.name}</TableCell>
										<TableCell>
											<Badge
												className={colorGroupClasses[player.team.group.color]}
											>
												{player.team.group.name}
											</Badge>
										</TableCell>
										<TableCell>{player.totalPoints}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	)
}
