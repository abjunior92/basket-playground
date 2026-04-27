import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData, useParams } from '@remix-run/react'
import { BarChart3, Medal, Shield, Users } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { colorGroupClasses } from '~/lib/types'
import { cn } from '~/lib/utils'

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

	return {
		team: {
			id: team.id,
			name: team.name,
			group: team.group,
			playersCount: team.players.length,
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
	const { playgroundId } = useParams()

	return (
		<div className="mx-auto max-w-lg space-y-4 p-4">
			<Header
				title={team.name}
				backLink={`/playground/${playgroundId}/rankings-and-stats`}
				icon={<Shield />}
			/>

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
								<span className="text-sm font-semibold">
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
									className="rounded-lg border border-slate-200 bg-white/80 p-3"
								>
									<div className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
										Giorno {match.day} · {match.timeSlot} · Campo {match.field}
									</div>
									<p className="mt-1 text-sm">
										<span className="font-medium">{team.name}</span> vs{' '}
										<Link
											to={`/playground/${playgroundId}/team/${match.opponent.id}`}
											className="font-medium underline-offset-2 hover:underline"
										>
											{match.opponent.name}
										</Link>
									</p>
									<p className="mt-1 text-sm text-slate-700">
										{isCompleted
											? `Risultato: ${match.teamScore ?? '-'} - ${match.opponentScore ?? '-'}`
											: 'Partita non conclusa'}
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
					'text-lg font-semibold text-slate-900',
					highlight && 'text-emerald-700',
				)}
			>
				{value}
			</p>
		</div>
	)
}
