import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import {
	Link,
	useLoaderData,
	useLocation,
	useParams,
	useSearchParams,
} from '@remix-run/react'
import {
	ChevronRight,
	ClipboardList,
	Clock,
	Crown,
	MapPin,
	Swords,
	Trophy,
} from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { prisma } from '~/db.server'
import { colorGroupClasses } from '~/lib/types'
import { cn, getDayLabel } from '~/lib/utils'

export const meta: MetaFunction = () => {
	return [
		{ title: 'Dettaglio partita' },
		{ name: 'description', content: 'Tabellino e risultato della partita' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	invariant(params.matchId, 'matchId is required')

	const match = await prisma.match.findFirst({
		where: { id: params.matchId, playgroundId: params.playgroundId },
		include: {
			team1: {
				include: {
					group: true,
					players: { orderBy: [{ surname: 'asc' }, { name: 'asc' }] },
				},
			},
			team2: {
				include: {
					group: true,
					players: { orderBy: [{ surname: 'asc' }, { name: 'asc' }] },
				},
			},
			playerStats: true,
		},
	})

	if (!match) {
		throw new Response('Partita non trovata', { status: 404 })
	}

	const pointsMap = new Map<string, number>()
	match.playerStats.forEach((stat) => pointsMap.set(stat.playerId, stat.points))

	const buildRoster = (players: typeof match.team1.players) =>
		players
			.map((player) => ({
				id: player.id,
				name: player.name,
				surname: player.surname,
				points: pointsMap.get(player.id) ?? 0,
				isExpelled: player.isExpelled,
				retired: player.retired,
			}))
			.sort(
				(a, b) =>
					b.points - a.points ||
					a.surname.localeCompare(b.surname, 'it') ||
					a.name.localeCompare(b.name, 'it'),
			)

	const team1Roster = buildRoster(match.team1.players)
	const team2Roster = buildRoster(match.team2.players)

	const isPlayed = match.score1 !== null && match.score2 !== null
	const isSameGroup = match.team1.group.id === match.team2.group.id

	// Migliori realizzatori della partita (possono essere più di uno a pari punti).
	let mvpIds: string[] = []
	if (isPlayed) {
		const allScorers = [...team1Roster, ...team2Roster]
		const topPoints = Math.max(0, ...allScorers.map((p) => p.points))
		if (topPoints > 0) {
			mvpIds = allScorers.filter((p) => p.points === topPoints).map((p) => p.id)
		}
	}

	return {
		match: {
			id: match.id,
			day: match.day,
			timeSlot: match.timeSlot,
			field: match.field,
			score1: match.score1,
			score2: match.score2,
			winner: match.winner,
			isPlayed,
			isSameGroup,
			team1: {
				id: match.team1.id,
				name: match.team1.name,
				group: match.team1.group,
				roster: team1Roster,
			},
			team2: {
				id: match.team2.id,
				name: match.team2.name,
				group: match.team2.group,
				roster: team2Roster,
			},
		},
		mvpIds,
	}
}

export default function GuestMatchDetail() {
	const { match, mvpIds } = useLoaderData<typeof loader>()
	const { playgroundId } = useParams()
	const location = useLocation()
	const [searchParams] = useSearchParams()

	const returnTo = searchParams.get('returnTo')
	const fallbackBackLink = `/playground/${playgroundId}/calendar`
	const backLink =
		returnTo && returnTo.startsWith(`/playground/${playgroundId}/`)
			? returnTo
			: fallbackBackLink
	const currentPath = `${location.pathname}${location.search}`

	const { team1, team2, isPlayed, isSameGroup } = match
	const isTeam1Winner = match.winner === team1.id
	const isTeam2Winner = match.winner === team2.id
	const isDraw = isPlayed && match.winner === null

	const resultBanner = !isPlayed
		? {
				text: 'Partita non ancora giocata',
				className: 'border-amber-200 bg-amber-50/90 text-amber-900',
			}
		: isDraw
			? {
					text: 'Pareggio: che equilibrio in campo!',
					className: 'border-slate-200 bg-white/80 text-slate-800',
				}
			: {
					text: `Vince ${isTeam1Winner ? team1.name : team2.name}`,
					className: 'border-emerald-200 bg-emerald-50/90 text-emerald-900',
				}

	return (
		<div className="mx-auto max-w-lg space-y-4 p-4">
			<Header title="Dettaglio partita" backLink={backLink} icon={<Swords />} />

			{/* Tabellone principale */}
			<section
				className={cn('section-blur', 'highlights-card-v2', 'match-reveal')}
				style={{ animationDelay: '40ms' }}
			>
				<div
					aria-hidden="true"
					className="menu-hero-overlay-v2 pointer-events-none absolute inset-0"
				/>
				<div
					aria-hidden="true"
					className="menu-hero-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
				/>
				<div className="relative">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-700">
							<Clock className="h-3.5 w-3.5 text-red-500" />
							{getDayLabel(match.day.toString())} · {match.timeSlot}
							<span aria-hidden="true">·</span>
							<MapPin className="h-3.5 w-3.5 text-red-500" />
							Campo {match.field}
						</p>
						{isSameGroup && (
							<Badge className={colorGroupClasses[team1.group.color]}>
								{team1.group.name}
							</Badge>
						)}
					</div>

					<div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 sm:gap-x-4">
						<TeamColumn
							team={team1}
							align="left"
							score={match.score1}
							isWinner={isTeam1Winner}
							isPlayed={isPlayed}
							showGroup={!isSameGroup}
							playgroundId={playgroundId}
							currentPath={currentPath}
						/>

						<div className="flex shrink-0 flex-col items-center gap-1 pt-6">
							<span className="rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-1 text-[10px] font-bold tracking-widest text-slate-500 sm:text-xs">
								VS
							</span>
						</div>

						<TeamColumn
							team={team2}
							align="right"
							score={match.score2}
							isWinner={isTeam2Winner}
							isPlayed={isPlayed}
							showGroup={!isSameGroup}
							playgroundId={playgroundId}
							currentPath={currentPath}
						/>
					</div>

					<p
						className={cn(
							'mt-4 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center text-sm font-semibold',
							resultBanner.className,
						)}
					>
						{isPlayed && !isDraw && (
							<Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
						)}
						{resultBanner.text}
					</p>
				</div>
			</section>

			{/* Tabellino giocatori */}
			<section
				className={cn('section-blur', 'match-reveal')}
				style={{ animationDelay: '140ms' }}
			>
				<div className="mb-3 flex items-center justify-between gap-2">
					<h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
						<ClipboardList className="h-5 w-5" />
						Tabellino
					</h2>
					{!isPlayed && (
						<span className="text-xs text-slate-600">in attesa di referto</span>
					)}
				</div>

				<div className="grid grid-cols-2 gap-3 sm:gap-4">
					<RosterColumn
						teamName={team1.name}
						roster={team1.roster}
						mvpIds={mvpIds}
						isPlayed={isPlayed}
						playgroundId={playgroundId}
						currentPath={currentPath}
					/>
					<RosterColumn
						teamName={team2.name}
						roster={team2.roster}
						mvpIds={mvpIds}
						isPlayed={isPlayed}
						playgroundId={playgroundId}
						currentPath={currentPath}
					/>
				</div>

				{isPlayed && mvpIds.length > 0 && (
					<p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-600">
						<Crown className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
						{mvpIds.length > 1
							? 'I migliori realizzatori della partita'
							: 'Miglior realizzatore della partita'}
					</p>
				)}
			</section>
		</div>
	)
}

type TeamSummary = {
	id: string
	name: string
	group: { color: keyof typeof colorGroupClasses; name: string }
}

function TeamColumn({
	team,
	align,
	score,
	isWinner,
	isPlayed,
	showGroup,
	playgroundId,
	currentPath,
}: {
	team: TeamSummary
	align: 'left' | 'right'
	score: number | null
	isWinner: boolean
	isPlayed: boolean
	showGroup: boolean
	playgroundId?: string
	currentPath: string
}) {
	return (
		<div
			className={cn('min-w-0', align === 'right' ? 'text-right' : 'text-left')}
		>
			<Link
				to={`/playground/${playgroundId}/team/${team.id}?returnTo=${encodeURIComponent(currentPath)}`}
				className={cn(
					'guest-link-pill max-w-full font-bold text-slate-900',
					align === 'right' && 'flex-row-reverse',
				)}
				aria-label={`Apri profilo squadra ${team.name}`}
			>
				{align === 'right' && (
					<ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
				)}
				<span className="line-clamp-2 leading-tight">{team.name}</span>
				{align === 'left' && (
					<ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
				)}
			</Link>

			{showGroup && (
				<div className={cn('mt-1.5', align === 'right' && 'flex justify-end')}>
					<Badge
						className={cn('text-[10px]', colorGroupClasses[team.group.color])}
					>
						{team.group.name}
					</Badge>
				</div>
			)}

			<p
				className={cn(
					'mt-2 font-mono text-4xl leading-none font-black tabular-nums',
					isPlayed
						? isWinner
							? 'text-emerald-600'
							: 'text-slate-900'
						: 'text-slate-300',
				)}
			>
				{isPlayed ? score : '–'}
			</p>
		</div>
	)
}

type RosterPlayer = {
	id: string
	name: string
	surname: string
	points: number
	isExpelled: boolean
	retired: boolean
}

function RosterColumn({
	teamName,
	roster,
	mvpIds,
	isPlayed,
	playgroundId,
	currentPath,
}: {
	teamName: string
	roster: RosterPlayer[]
	mvpIds: string[]
	isPlayed: boolean
	playgroundId?: string
	currentPath: string
}) {
	return (
		<div className="min-w-0">
			<p className="mb-2 line-clamp-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
				{teamName}
			</p>
			{roster.length > 0 ? (
				<ul className="space-y-1.5">
					{roster.map((player) => {
						const isMvp = isPlayed && mvpIds.includes(player.id)
						return (
							<li key={player.id}>
								<Link
									to={`/playground/${playgroundId}/player/${player.id}?returnTo=${encodeURIComponent(currentPath)}`}
									aria-label={`Apri profilo di ${player.name} ${player.surname}`}
									className={cn(
										'flex items-center justify-between gap-1.5 rounded-lg border px-2 py-1.5 text-sm transition-transform duration-200 ease-out focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none motion-safe:hover:-translate-y-0.5',
										isMvp
											? 'border-amber-300 bg-amber-50/90'
											: 'border-slate-200 bg-white/80 hover:bg-white',
									)}
								>
									<span className="flex min-w-0 items-center gap-1">
										{isMvp && (
											<Crown
												className="match-mvp-pulse h-3.5 w-3.5 shrink-0 text-amber-500"
												aria-label="Miglior realizzatore"
											/>
										)}
										<span className="flex min-w-0 flex-col leading-tight">
											<span className="text-[11px] wrap-break-word text-slate-600">
												{player.name}
											</span>
											<span className="font-bold wrap-break-word text-slate-900">
												{player.surname}
											</span>
										</span>
									</span>
									<span
										className={cn(
											'shrink-0 font-mono font-semibold tabular-nums',
											isPlayed && player.points > 0
												? 'text-slate-900'
												: 'text-slate-400',
										)}
									>
										{isPlayed ? player.points : '–'}
									</span>
								</Link>
							</li>
						)
					})}
				</ul>
			) : (
				<p className="text-xs text-slate-500">Nessun giocatore a roster.</p>
			)}
		</div>
	)
}
