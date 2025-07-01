import { PrismaClient } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	redirect,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import { useFetcher, useLoaderData, useParams } from '@remix-run/react'
import { CalendarRange, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { colorGroupClasses } from '~/lib/types'
import { cn, getDayLabel } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Calendario Partite' },
		{ name: 'description', content: 'Calendario Partite' },
	]
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const formData = await request.formData()
	const intent = formData.get('intent') as string

	if (intent === 'filter-team') {
		const teamId = formData.get('teamId') as string
		const url = new URL(request.url)

		if (teamId === 'all') {
			url.searchParams.delete('teamId')
			url.searchParams.delete('groupId')
		} else {
			url.searchParams.set('teamId', teamId)
			url.searchParams.delete('groupId')
		}

		return redirect(url.pathname + url.search)
	}

	if (intent === 'filter-group') {
		const groupId = formData.get('groupId') as string
		const url = new URL(request.url)

		if (groupId === 'all') {
			url.searchParams.delete('groupId')
			url.searchParams.delete('teamId')
		} else {
			url.searchParams.set('groupId', groupId)
			url.searchParams.delete('teamId')
		}

		return redirect(url.pathname + url.search)
	}

	return json({ error: 'Azione non riconosciuta' }, { status: 400 })
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')

	// Recupera il teamId dall'URL se presente
	const url = new URL(request.url)
	const teamId = url.searchParams.get('teamId')
	const groupId = url.searchParams.get('groupId')

	// Costruisci la query per le partite
	const matchesWhere: any = {
		playgroundId: params.playgroundId,
	}

	// Aggiungi filtro per squadra se specificato
	if (teamId && teamId !== 'all') {
		matchesWhere.OR = [{ team1Id: teamId }, { team2Id: teamId }]
	}

	// Aggiungi filtro per girone se specificato
	if (groupId && groupId !== 'all') {
		matchesWhere.OR = [
			{ team1: { groupId: groupId } },
			{ team2: { groupId: groupId } },
		]
	}

	const matches = await prisma.match.findMany({
		where: matchesWhere,
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

	// Recupera tutti i gironi del playground
	const groups = await prisma.group.findMany({
		where: {
			playgroundId: params.playgroundId,
		},
	})

	// Recupera tutte le squadre del playground
	const teams = await prisma.team.findMany({
		where: {
			group: {
				playgroundId: params.playgroundId,
			},
		},
		include: {
			group: true,
		},
		orderBy: [{ group: { name: 'asc' } }, { name: 'asc' }],
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

	return json({
		matchesByDay,
		teams,
		groups,
		selectedTeamId: teamId || 'all',
		selectedGroupId: groupId || 'all',
	})
}

export default function Matches() {
	const { matchesByDay, teams, groups, selectedTeamId, selectedGroupId } =
		useLoaderData<typeof loader>()
	const params = useParams()
	const [hiddenDays, setHiddenDays] = useState<Set<number>>(new Set())
	const fetcher = useFetcher()

	const toggleDayVisibility = (day: number) => {
		setHiddenDays((prev) => {
			const newSet = new Set(prev)
			if (newSet.has(day)) {
				newSet.delete(day)
			} else {
				newSet.add(day)
			}
			return newSet
		})
	}

	const handleTeamChange = (value: string) => {
		fetcher.submit({ intent: 'filter-team', teamId: value }, { method: 'post' })
	}

	const handleGroupChange = (value: string) => {
		fetcher.submit(
			{ intent: 'filter-group', groupId: value },
			{ method: 'post' },
		)
	}

	return (
		<div className="p-4">
			<div className="mb-4 flex items-center justify-between">
				<Header
					title="Calendario Partite"
					backLink={`/playground/${params.playgroundId}/menu`}
					icon={<CalendarRange />}
				/>
			</div>

			<div className="flex flex-col md:flex-row md:gap-4 md:[&>div]:w-96">
				{/* Select per filtrare per girone */}
				<div className="mb-6 w-full md:w-auto">
					<span className="text-sm">
						Filtra il calendario per <b>girone</b>
					</span>
					<Select value={selectedGroupId} onValueChange={handleGroupChange}>
						<SelectTrigger className="w-full md:max-w-sm">
							<SelectValue placeholder="Filtra per girone" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Tutti i gironi</SelectItem>
							{groups.map((group) => (
								<SelectItem key={group.id} value={group.id}>
									<Badge className={colorGroupClasses[group.color]}>
										{group.name}
									</Badge>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Select per filtrare per squadra */}
				<div className="mb-6 w-full md:w-auto">
					<span className="text-sm">
						Filtra il calendario per <b>squadra</b>
					</span>
					<Select value={selectedTeamId} onValueChange={handleTeamChange}>
						<SelectTrigger className="w-full md:max-w-sm">
							<SelectValue placeholder="Filtra per squadra" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Tutte le squadre</SelectItem>
							{teams.map((team) => (
								<SelectItem key={team.id} value={team.id}>
									<div className="flex items-center space-x-2">
										<Badge className={colorGroupClasses[team.group.color]}>
											{team.group.name}
										</Badge>
										<span>{team.name}</span>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{Object.keys(matchesByDay).map((day) => {
				const dayNumber = Number(day)
				const isHidden = hiddenDays.has(dayNumber)

				return (
					<div key={day} className="py-4">
						<div className="mb-2 flex items-center justify-between">
							<h2
								className={cn(
									'text-xl font-semibold',
									isHidden && 'text-gray-400',
								)}
							>
								{getDayLabel(day) + ' - Giorno ' + day}
							</h2>
							<Button
								variant="outline"
								onClick={() => toggleDayVisibility(dayNumber)}
								className="w-32"
							>
								{isHidden ? (
									<>
										Mostra
										<EyeOff className="h-5 w-5" />
									</>
								) : (
									<>
										Nascondi
										<Eye className="h-5 w-5" />
									</>
								)}
							</Button>
						</div>
						{!isHidden ? (
							<div className="overflow-hidden rounded-lg border border-gray-300">
								<Table className="w-full border-collapse">
									<TableHeader>
										<TableRow className="bg-gray-100">
											<TableHead className="w-10 md:w-3xs">
												⏱️ <span className="hidden md:inline">Orario</span>
											</TableHead>
											<TableHead className="max-w-12">
												📍 <span className="hidden md:inline">Campo</span>
											</TableHead>
											<TableHead className="w-auto">
												👥 <span className="hidden md:inline">Squadra 1</span>
											</TableHead>
											<TableHead className="w-auto">
												👥 <span className="hidden md:inline">Squadra 2</span>
											</TableHead>
											<TableHead className="w-16 md:w-auto">
												📝 <span className="hidden md:inline">Risultato</span>
											</TableHead>
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
															<Badge
																className={cn(
																	'inline-table',
																	colorGroupClasses[match.team1.group.color],
																)}
															>
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
															<Badge
																className={cn(
																	'inline-table',
																	colorGroupClasses[match.team2.group.color],
																)}
															>
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
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							</div>
						) : (
							<div className="flex h-10 w-full justify-center rounded-lg border border-gray-300 bg-gray-100"></div>
						)}
					</div>
				)
			})}
		</div>
	)
}
