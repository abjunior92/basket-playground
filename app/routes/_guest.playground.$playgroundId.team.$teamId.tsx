import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import {
	Link,
	useLoaderData,
	useLocation,
	useParams,
	useSearchParams,
} from '@remix-run/react'
import {
	BarChart3,
	ChevronRight,
	Medal,
	Shield,
	UserRound,
	Users,
} from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { colorGroupClasses, playerLevelsTransform } from '~/lib/types'
import { cn, getDayLabel } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Profilo Squadra' },
		{ name: 'description', content: 'Statistiche pubbliche della squadra' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	invariant(params.teamId, 'teamId is required')

	const team = await prisma.team.findFirst({
		where: {
			id: params.teamId,
			playgroundId: params.playgroundId,
		},
		include: {
			group: true,
			matchesAsTeam1: {
				where: { playgroundId: params.playgroundId },
				include: { team2: { include: { group: true } } },
			},
			matchesAsTeam2: {
				where: { playgroundId: params.playgroundId },
				include: { team1: { include: { group: true } } },
			},
			players: true,
		},
	})

	if (!team) {
		throw new Response('Team non trovato', { status: 404 })
	}

	const teamMatches = [
		...team.matchesAsTeam1.map((match) => ({
			id: match.id,
			day: match.day,
			timeSlot: match.timeSlot,
			field: match.field,
			teamScore: match.score1,
			opponentScore: match.score2,
			winner: match.winner,
			opponent: match.team2,
		})),
		...team.matchesAsTeam2.map((match) => ({
			id: match.id,
			day: match.day,
			timeSlot: match.timeSlot,
			field: match.field,
			teamScore: match.score2,
			opponentScore: match.score1,
			winner: match.winner,
			opponent: match.team1,
		})),
	].sort((a, b) => {
		if (a.day !== b.day) return b.day - a.day
		return b.timeSlot.localeCompare(a.timeSlot)
	})

	const completedMatches = teamMatches.filter((match) => match.winner !== null)
	const matchesWon = completedMatches.filter(
		(match) => match.winner === team.id,
	).length

	const pointsScored = completedMatches.reduce(
		(total, match) => total + (match.teamScore ?? 0),
		0,
	)
	const pointsConceded = completedMatches.reduce(
		(total, match) => total + (match.opponentScore ?? 0),
		0,
	)

	const playersPoints = await prisma.playerMatchStats.findMany({
		where: {
			player: {
				teamId: team.id,
			},
		},
		include: {
			player: true,
		},
	})

	const topScorers = Object.values(
		playersPoints.reduce<
			Record<
				string,
				{ id: string; name: string; surname: string; points: number }
			>
		>((acc, stat) => {
			const existing = acc[stat.playerId]
			if (existing) {
				existing.points += stat.points
				return acc
			}

			acc[stat.playerId] = {
				id: stat.player.id,
				name: stat.player.name,
				surname: stat.player.surname,
				points: stat.points,
			}
			return acc
		}, {}),
	)
		.sort((a, b) => b.points - a.points)
		.slice(0, 3)

	const players = [...team.players]
		.sort(
			(a, b) =>
				a.surname.localeCompare(b.surname, 'it') ||
				a.name.localeCompare(b.name, 'it'),
		)
		.map((p) => ({
			id: p.id,
			name: p.name,
			surname: p.surname,
			birthYear: p.birthYear,
			level: p.level,
			retired: p.retired,
			isExpelled: p.isExpelled,
		}))

	return {
		team: {
			id: team.id,
			name: team.name,
			group: team.group,
			playersCount: players.length,
			players,
		},
		stats: {
			matchesPlayed: completedMatches.length,
			matchesWon,
			pointsScored,
			pointsConceded,
			pointsDifference: pointsScored - pointsConceded,
		},
		lastMatches: teamMatches.slice(0, 5),
		topScorers,
	}
}

export default function GuestTeamProfile() {
	const { team, stats, lastMatches, topScorers } =
		useLoaderData<typeof loader>()
	const players = team.players
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
			<Header title={team.name} backLink={backLink} icon={<Shield />} />

			<section className="section-blur">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="text-sm text-slate-600">Profilo squadra</p>
						<h2 className="text-xl font-bold">{team.name}</h2>
					</div>
					<Badge className={colorGroupClasses[team.group.color]}>
						{team.group.name}
					</Badge>
				</div>
				<p className="mt-3 flex items-center gap-2 text-sm text-slate-700">
					<Users className="h-4 w-4" />
					{team.playersCount} giocatori a roster
				</p>
			</section>

			<section className="section-blur">
				<h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
					<UserRound className="h-5 w-5" />
					Roster
				</h3>
				{players.length > 0 ? (
					<ul className="space-y-2">
						{players.map((player) => (
							<li key={player.id}>
								<Link
									to={`/playground/${playgroundId}/player/${player.id}?returnTo=${encodeURIComponent(currentPath)}`}
									className={cn(
										'guest-link-pill-bordered flex w-full items-center justify-between gap-2 py-2.5',
									)}
								>
									<span className="min-w-0 flex-1 text-left text-sm font-medium">
										{player.name} {player.surname}
										<span className="mt-0.5 block text-xs font-normal text-slate-600">
											Anno {player.birthYear} ·{' '}
											{playerLevelsTransform[player.level]}
										</span>
									</span>
									<span className="flex shrink-0 items-center gap-1.5">
										{player.isExpelled ? (
											<Badge className="bg-red-100 text-xs text-red-800">
												Espulso
											</Badge>
										) : player.retired ? (
											<Badge className="bg-slate-200 text-xs text-slate-800">
												Ritirato
											</Badge>
										) : null}
										<ChevronRight className="h-4 w-4 opacity-70" />
									</span>
								</Link>
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-slate-700">
						Nessun giocatore associato a questa squadra.
					</p>
				)}
			</section>

			<section className="section-blur">
				<h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
					<BarChart3 className="h-5 w-5" />
					Statistiche
				</h3>
				<div className="grid gap-2 sm:grid-cols-2">
					<StatTile label="Partite giocate" value={stats.matchesPlayed} />
					<StatTile label="Partite vinte" value={stats.matchesWon} />
					<StatTile label="Punti fatti" value={stats.pointsScored} />
					<StatTile label="Punti subiti" value={stats.pointsConceded} />
					<StatTile
						label="+/-"
						value={stats.pointsDifference}
						highlight={stats.pointsDifference >= 0}
					/>
				</div>
			</section>

			<section className="section-blur">
				<h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
					<Medal className="h-5 w-5" />
					Top scorer squadra
				</h3>
				{topScorers.length > 0 ? (
					<ul className="space-y-2">
						{topScorers.map((scorer, index) => (
							<li
								key={scorer.id}
								className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/80 px-3 py-2"
							>
								<span className="text-sm">
									{index + 1}. {scorer.name} {scorer.surname}
								</span>
								<span className="font-mono text-sm font-semibold tabular-nums">
									{scorer.points} pt
								</span>
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-slate-700">
						Nessuna statistica punti disponibile per questa squadra.
					</p>
				)}
			</section>

			<section className="section-blur">
				<h3 className="mb-3 text-lg font-semibold">Ultime partite</h3>
				{lastMatches.length > 0 ? (
					<ul className="space-y-2">
						{lastMatches.map((match) => {
							const isWon = match.winner === team.id
							const isCompleted = match.winner !== null

							return (
								<li
									key={match.id}
									className={cn(
										'rounded-lg border border-slate-200 bg-white/80 p-3',
										isWon
											? 'border-emerald-200 bg-emerald-50/80'
											: 'border-rose-200 bg-rose-50/80',
									)}
								>
									<div className="text-xs font-semibold tracking-wide text-slate-600">
										{getDayLabel(match.day.toString())} · {match.timeSlot} ·
										Campo {match.field}
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
									<div className="flex items-center justify-between gap-1">
										<p className="mt-1 text-sm text-slate-700">
											{isCompleted ? (
												<>
													Risultato:{' '}
													<span className="font-mono font-semibold tabular-nums">
														{match.teamScore ?? '-'}
													</span>{' '}
													-{' '}
													<span className="font-mono font-semibold tabular-nums">
														{match.opponentScore ?? '-'}
													</span>
												</>
											) : (
												'Partita non conclusa'
											)}
										</p>
										{isCompleted ? (
											<p
												className={cn(
													'mt-1 text-xs font-semibold',
													isWon ? 'text-emerald-700' : 'text-rose-700',
												)}
											>
												{isWon ? 'Vittoria' : 'Sconfitta'}
											</p>
										) : null}
									</div>
								</li>
							)
						})}
					</ul>
				) : (
					<p className="text-sm text-slate-700">
						Nessuna partita presente per questa squadra.
					</p>
				)}
			</section>
		</div>
	)
}

function StatTile({
	label,
	value,
	highlight = false,
}: {
	label: string
	value: number
	highlight?: boolean
}) {
	return (
		<div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
			<p className="text-xs text-slate-600">{label}</p>
			<p
				className={cn(
					'font-mono text-lg font-semibold text-slate-900 tabular-nums',
					highlight && 'text-emerald-700',
				)}
			>
				{value}
			</p>
		</div>
	)
}
