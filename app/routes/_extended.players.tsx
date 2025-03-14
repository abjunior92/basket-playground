import { PrismaClient } from '@prisma/client'
import { type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { ArrowUp, ChevronDown, ChevronUp, Pencil, Users2 } from 'lucide-react'
import { useState } from 'react'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Separator } from '~/components/ui/separator'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { type PlayerStatsType } from '~/lib/types'
import { cn } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Statistiche Giocatori' },
		{ name: 'description', content: 'Statistiche Giocatori' },
	]
}

export const loader = async () => {
	const players = await prisma.player.findMany({
		include: {
			matchStats: {
				include: {
					match: {
						include: {
							team1: true,
							team2: true,
						},
					},
				},
			},
			team: true,
		},
	})

	const playerStats: PlayerStatsType[] = players.map((player) => ({
		id: player.id,
		name: player.name,
		surname: player.surname,
		birthYear: player.birthYear,
		team: player.team.name,
		teamId: player.teamId,
		paid: player.paid,
		totalPoints: player.totalPoints,
		matches: player.matchStats.map((stat) => ({
			matchId: stat.matchId,
			opponent:
				stat.match.team1Id === player.teamId
					? stat.match.team2.name
					: stat.match.team1.name,
			day: stat.match.day,
			timeSlot: stat.match.timeSlot,
			points: stat.points,
		})),
	}))

	return { playerStats }
}

const tableHeads: { label: string; key: keyof PlayerStatsType }[] = [
	{ label: 'Nome', key: 'name' },
	{ label: 'Cognome', key: 'surname' },
	{ label: 'Anno di nascita', key: 'birthYear' },
	{ label: 'Squadra', key: 'team' },
	{ label: 'Iscrizione Pagata', key: 'paid' },
	{ label: 'Totale Punti', key: 'totalPoints' },
]

export default function PlayerStatsPage() {
	const { playerStats } = useLoaderData<typeof loader>()
	const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
	const [search, setSearch] = useState('')
	const [sortColumn, setSortColumn] = useState<keyof PlayerStatsType | null>(
		null,
	)
	const [sortDirection, setSortDirection] = useState('asc')

	// Filtra i giocatori in base alla ricerca (case insensitive)
	const filteredPlayers = playerStats.filter((player) =>
		`${player.name} ${player.surname}`
			.toLowerCase()
			.includes(search.toLowerCase()),
	)

	// Funzione per ordinare i dati
	const sortedPlayers = [...filteredPlayers].sort((a, b) => {
		if (!sortColumn) return 0
		const valueA = a[sortColumn]
		const valueB = b[sortColumn]

		if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1
		if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1
		return 0
	})

	// Funzione per gestire il click sull'intestazione della tabella
	const handleSort = (column: keyof PlayerStatsType) => {
		if (sortColumn === column) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
		} else {
			setSortColumn(column)
			setSortDirection('asc')
		}
	}

	return (
		<div className="space-y-4 p-4">
			<Header title="Statistiche Giocatori" backLink="/" icon={<Users2 />} />

			<Input
				type="text"
				placeholder="Cerca un giocatore..."
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				className="max-w-lg"
			/>

			<div className="overflow-hidden rounded-lg border border-gray-300">
				<Table className="w-full border-collapse">
					<TableHeader>
						<TableRow className="bg-gray-100">
							<TableHead></TableHead>
							{tableHeads.map(({ label, key }) => (
								<TableHead
									key={key}
									onClick={() => handleSort(key)}
									className={`cursor-pointer select-none ${
										sortColumn === key ? 'text-primary' : ''
									}`}
								>
									<div className="flex items-center gap-1">
										{label}

										<span
											className={cn('transition-transform', {
												'rotate-180': sortDirection === 'desc',
												visible: sortColumn === key,
												invisible: sortColumn !== key,
											})}
										>
											<ArrowUp className="h-4 w-4" />
										</span>
									</div>
								</TableHead>
							))}
							<TableHead></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedPlayers.map((player) => (
							<>
								<TableRow
									key={player.id}
									role="button"
									onClick={() =>
										setExpandedPlayer(
											expandedPlayer === player.id ? null : player.id,
										)
									}
								>
									<TableCell className="text-center">
										<Button
											asChild
											variant={'outline'}
											onClick={(e) => {
												e.stopPropagation()
											}}
										>
											<Link to={`/teams/${player.teamId}`}>
												<Pencil />
											</Link>
										</Button>
									</TableCell>
									<TableCell>{player.name}</TableCell>
									<TableCell>{player.surname}</TableCell>
									<TableCell>{player.birthYear}</TableCell>
									<TableCell>{player.team}</TableCell>
									<TableCell>{player.paid ? '✅' : '❌'}</TableCell>
									<TableCell>{player.totalPoints}</TableCell>
									<TableCell className="w-10">
										<Button variant={'link'} size="icon">
											{expandedPlayer === player.id ? (
												<ChevronUp />
											) : (
												<ChevronDown />
											)}
										</Button>
									</TableCell>
								</TableRow>
								{expandedPlayer === player.id && (
									<TableRow>
										<TableCell colSpan={7}>
											<div className="mb-2 grid grid-cols-4">
												<div className="text-center font-bold">Giorno</div>
												<div className="text-center font-bold">Orario</div>
												<div className="text-center font-bold">Avversario</div>
												<div className="text-center font-bold">Punti</div>
											</div>
											<Separator />
											{player.matches.map((match) => (
												<div
													key={match.matchId}
													className="grid grid-cols-4 py-1"
												>
													<div className="text-center">{match.day}</div>
													<div className="text-center">{match.timeSlot}</div>
													<div className="text-center">{match.opponent}</div>
													<div className="text-center">{match.points}</div>
												</div>
											))}
										</TableCell>
									</TableRow>
								)}
							</>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
