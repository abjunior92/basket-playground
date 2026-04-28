import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import {
	Link,
	useLoaderData,
	useLocation,
	useParams,
	useSearchParams,
} from '@remix-run/react'
import { BarChart3, ChevronRight, Shield, UserRound } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { colorGroupClasses } from '~/lib/types'
import { cn, getDayLabel } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Profilo Giocatore' },
		{ name: 'description', content: 'Statistiche pubbliche del giocatore' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	invariant(params.playerId, 'playerId is required')

	const player = await prisma.player.findFirst({
		where: {
			id: params.playerId,
			playgroundId: params.playgroundId,
		},
		include: {
			team: {
				include: {
					group: true,
				},
			},
			matchStats: {
				include: {
					match: {
						select: {
							id: true,
							day: true,
							timeSlot: true,
							field: true,
							team1Id: true,
							team2Id: true,
							team1: { select: { id: true, name: true } },
							team2: { select: { id: true, name: true } },
						},
					},
				},
				orderBy: [{ match: { day: 'desc' } }, { match: { timeSlot: 'desc' } }],
			},
		},
	})

	if (!player) {
		throw new Response('Giocatore non trovato', { status: 404 })
	}

	const groupStats = player.matchStats.filter(
		(stat) => stat.match.day !== 5 && stat.match.day !== 7,
	)
	const finalsStats = player.matchStats.filter(
		(stat) => stat.match.day === 5 || stat.match.day === 7,
	)

	const pointsByDay = Object.entries(
		player.matchStats.reduce<Record<number, number>>((acc, stat) => {
			const day = stat.match.day
			acc[day] = (acc[day] ?? 0) + stat.points
			return acc
		}, {}),
	)
		.map(([day, points]) => ({ day: Number(day), points }))
		.sort((a, b) => a.day - b.day)

	const recentMatches = player.matchStats.slice(0, 6).map((stat) => {
		const isTeam1 = stat.match.team1Id === player.teamId
		const opponent = isTeam1 ? stat.match.team2 : stat.match.team1
		return {
			id: stat.match.id,
			day: stat.match.day,
			timeSlot: stat.match.timeSlot,
			field: stat.match.field,
			points: stat.points,
			opponent,
		}
	})

	return {
		player: {
			id: player.id,
			name: player.name,
			surname: player.surname,
			birthYear: player.birthYear,
			teamId: player.team.id,
			teamName: player.team.name,
			groupName: player.team.group.name,
			groupColor: player.team.group.color,
			warnings: player.warnings,
			isExpelled: player.isExpelled,
		},
		aggregates: {
			totalPoints: player.matchStats.reduce(
				(sum, stat) => sum + stat.points,
				0,
			),
			groupPoints: groupStats.reduce((sum, stat) => sum + stat.points, 0),
			finalsPoints: finalsStats.reduce((sum, stat) => sum + stat.points, 0),
			matchesPlayed: player.matchStats.length,
		},
		pointsByDay,
		recentMatches,
	}
}

export default function GuestPlayerProfile() {
	const { player, aggregates, pointsByDay, recentMatches } =
		useLoaderData<typeof loader>()
	const { playgroundId } = useParams()
	const location = useLocation()
	const [searchParams] = useSearchParams()
	const returnTo = searchParams.get('returnTo')
	const fallbackBackLink = `/playground/${playgroundId}/rankings-and-stats`
	const backLink =
		returnTo && returnTo.startsWith(`/playground/${playgroundId}/`)
			? returnTo
			: fallbackBackLink
	const currentPath = `${location.pathname}${location.search}`

	return (
		<div className="mx-auto max-w-lg space-y-4 p-4">
			<Header
				title={`${player.name} ${player.surname}`}
				backLink={backLink}
				icon={<UserRound />}
			/>

			<section className="section-blur">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-sm text-slate-600">Profilo giocatore</p>
						<h2 className="text-xl font-bold">
							{player.name} {player.surname}
						</h2>
						<p className="mt-1 text-sm text-slate-700">
							Anno {player.birthYear}
						</p>
					</div>
					<Badge
						className={cn('capitalize', colorGroupClasses[player.groupColor])}
					>
						{player.groupName}
					</Badge>
				</div>

				<div className="mt-3 flex flex-wrap gap-2">
					<Link
						to={`/playground/${playgroundId}/team/${player.teamId}?returnTo=${encodeURIComponent(currentPath)}`}
						className="guest-link-pill"
					>
						<Shield className="h-3.5 w-3.5" />
						<span>{player.teamName}</span>
						<ChevronRight className="h-3.5 w-3.5 opacity-80" />
					</Link>

					{player.isExpelled ? (
						<Badge className="bg-red-100 text-red-800">Espulso</Badge>
					) : player.warnings > 0 ? (
						<Badge className="bg-yellow-100 text-yellow-800">
							Ammonizioni: {player.warnings}
						</Badge>
					) : (
						<Badge className="bg-emerald-100 text-emerald-800">
							Nessun richiamo
						</Badge>
					)}
				</div>
			</section>

			<section className="section-blur">
				<h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
					<BarChart3 className="h-5 w-5" />
					Statistiche punti
				</h3>
				<div className="grid gap-2 sm:grid-cols-2">
					<StatTile label="Punti totali" value={aggregates.totalPoints} />
					<StatTile label="Punti gironi" value={aggregates.groupPoints} />
					<StatTile label="Punti finals" value={aggregates.finalsPoints} />
					<StatTile label="Partite giocate" value={aggregates.matchesPlayed} />
				</div>
			</section>

			<section className="section-blur">
				<h3 className="mb-3 text-lg font-semibold">Andamento per giornata</h3>
				{pointsByDay.length > 0 ? (
					<ul className="space-y-2">
						{pointsByDay.map((item) => (
							<li
								key={item.day}
								className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/80 px-3 py-2"
							>
								<div className="flex items-center gap-1">
									<span className="text-sm">
										{getDayLabel(item.day.toString())}
									</span>
									<span className="text-xs text-slate-600">
										- giorno {item.day}
									</span>
								</div>
								<span className="text-sm font-semibold">{item.points} pt</span>
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-slate-700">
						Nessun dato disponibile per l'andamento giornaliero.
					</p>
				)}
			</section>

			<section className="section-blur">
				<h3 className="mb-3 text-lg font-semibold">Ultime partite giocate</h3>
				{recentMatches.length > 0 ? (
					<ul className="space-y-2">
						{recentMatches.map((match) => (
							<li
								key={match.id}
								className="rounded-lg border border-slate-200 bg-white/80 p-3"
							>
								<div className="text-xs font-semibold tracking-wide text-slate-600">
									{getDayLabel(match.day.toString())} · {match.timeSlot} · Campo{' '}
									{match.field}
								</div>
								<p className="mt-1 text-sm">
									vs{' '}
									<Link
										to={`/playground/${playgroundId}/team/${match.opponent.id}?returnTo=${encodeURIComponent(currentPath)}`}
										className="font-medium underline-offset-2 hover:underline"
									>
										{match.opponent.name}
									</Link>
								</p>
								<p className="mt-1 text-sm text-slate-700">
									Punti segnati:{' '}
									<span className="font-semibold">{match.points}</span>
								</p>
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-slate-700">Nessuna partita disponibile.</p>
				)}
			</section>
		</div>
	)
}

function StatTile({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
			<p className="text-xs text-slate-600">{label}</p>
			<p className="text-lg font-semibold text-slate-900">{value}</p>
		</div>
	)
}
