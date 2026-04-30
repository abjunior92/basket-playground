import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { FacebookIcon } from 'icons/lucide-facebook'
import { InstagramIcon } from 'icons/lucide-instagram'
import {
	Activity,
	Award,
	BookOpenText,
	CalendarDays,
	Flame,
	Medal,
	Swords,
	Trophy,
} from 'lucide-react'
import invariant from 'tiny-invariant'
import {
	cn,
	getDayLabel,
	getLiveAndUpcomingMatches,
	getTournamentDayCandidates,
} from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Basket Playgrounds' },
		{ name: 'description', content: 'Basket Playgrounds' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')

	const playground = await prisma.playground.findUnique({
		where: { id: params.playgroundId },
	})
	const palmaresList = await prisma.tournamentPalmares.findMany({
		select: { year: true },
		orderBy: { year: 'desc' },
	})
	const matches = await prisma.match.findMany({
		where: { playgroundId: params.playgroundId },
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

	const currentDayCandidates = getTournamentDayCandidates(new Date())
	const { inProgressMatches, upcomingMatches } = getLiveAndUpcomingMatches(
		matches,
		currentDayCandidates,
		5,
	)
	const latestResults = matches
		.filter((match) => match.winner !== null)
		.reverse()
		.slice(0, 3)

	if (!playground) throw new Response('Not Found', { status: 404 })

	return {
		playground,
		palmaresList,
		inProgressMatches,
		upcomingMatches,
		latestResults,
	}
}

export default function Index() {
	const {
		playground,
		palmaresList,
		inProgressMatches,
		upcomingMatches,
		latestResults,
	} = useLoaderData<typeof loader>()

	return (
		<main className="flex px-4 py-4 md:min-h-screen md:items-center md:justify-center">
			<div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 md:gap-8">
				<header className={cn('menu-hero-card', 'menu-hero-card-v2')}>
					<div
						aria-hidden="true"
						className="menu-hero-overlay-v2 pointer-events-none absolute inset-0"
					/>
					<div
						aria-hidden="true"
						className="menu-hero-grain pointer-events-none absolute inset-0 opacity-25 mix-blend-soft-light"
					/>
					<div className="relative">
						<p className="text-sm font-medium tracking-wide text-slate-700/95">
							{playground.name}
						</p>
						<h1 className="mt-2 flex items-center gap-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
							<span className="drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
								Il Tralcio
							</span>
							<span
								aria-hidden="true"
								className="inline-block transition-transform duration-300 ease-out motion-safe:animate-bounce motion-safe:hover:scale-110 motion-safe:hover:rotate-12"
							>
								🏀
							</span>
						</h1>
						<p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-slate-800/95">
							Accedi rapidamente alle sezioni principali, visualizza i tornei e
							le statistiche da un unico punto.
						</p>
					</div>
				</header>

				<section className="section-blur">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="flex items-center gap-2 text-lg font-semibold">
							<Activity className="h-5 w-5" />
							<span>Attività torneo</span>
						</h2>
						<Link
							to={`/playground/${playground.id}/highlights`}
							className="guest-link-pill"
						>
							<span>Highlights</span>
							<Flame className="h-3.5 w-3.5" />
						</Link>
					</div>
					<div className="space-y-3">
						{inProgressMatches.length > 0 ? (
							<>
								<p className="text-sm font-medium text-emerald-700">
									Live now 🔥
								</p>
								<ul className="space-y-2">
									{inProgressMatches.map((match) => (
										<li
											key={match.id}
											className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3"
										>
											<div className="flex items-center gap-2">
												<div className="h-2 w-2 animate-pulse rounded-full bg-red-700">
													<span className="sr-only">Live</span>
												</div>
												<div className="flex flex-col">
													<div className="mb-1 text-xs font-semibold tracking-wide text-emerald-900">
														{getDayLabel(match.day.toString())} ·{' '}
														{match.timeSlot} · Campo {match.field}
													</div>
													<p className="text-sm text-slate-800">
														{match.team1.name} - {match.team2.name}
													</p>
												</div>
											</div>
										</li>
									))}
								</ul>
							</>
						) : (
							<p className="text-sm text-slate-700">
								Al momento non ci sono partite in corso.
							</p>
						)}

						{upcomingMatches.length > 0 ? (
							<>
								<p className="pt-2 text-sm font-medium text-slate-700">
									Prossime partite
								</p>
								<ul className="space-y-2">
									{upcomingMatches.map((match) => (
										<li
											key={match.id}
											className="rounded-lg border border-amber-200 bg-amber-50/80 p-3"
										>
											<div className="mb-1 text-xs font-semibold tracking-wide text-slate-600">
												{getDayLabel(match.day.toString())} · {match.timeSlot} ·
												Campo {match.field}
											</div>
											<p className="text-sm text-slate-800">
												{match.team1.name} vs {match.team2.name}
											</p>
										</li>
									))}
								</ul>
							</>
						) : null}

						{latestResults.length > 0 ? (
							<>
								<p className="pt-2 text-sm font-medium text-slate-700">
									Ultimi risultati
								</p>
								<ul className="space-y-2">
									{latestResults.map((match) => (
										<li
											key={match.id}
											className="rounded-lg border border-slate-200 bg-white/80 p-3"
										>
											<div className="mb-1 text-xs font-semibold tracking-wide text-slate-600">
												{getDayLabel(match.day.toString())} · {match.timeSlot} ·
												Campo {match.field}
											</div>
											<p className="text-sm text-slate-800">
												{match.team1.name}{' '}
												<span className="font-semibold">
													{match.score1 ?? '-'}
												</span>{' '}
												-{' '}
												<span className="font-semibold">
													{match.score2 ?? '-'}
												</span>{' '}
												{match.team2.name}
											</p>
										</li>
									))}
								</ul>
							</>
						) : null}
					</div>
					<div className="mt-4">
						<Link
							className="nav-button group justify-center"
							to={`/playground/${playground.id}/calendar`}
						>
							<span className="nav-button-animate-text">
								Apri calendario completo
							</span>
						</Link>
					</div>
				</section>

				<section className="section-blur">
					<h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
						<Trophy className="h-5 w-5" />
						<span>Torneo</span>
					</h2>
					<nav>
						<ul className="grid gap-2 md:grid-cols-2">
							{resources.map(({ href, text, icon }) => (
								<li key={href}>
									<Link
										className="nav-button group"
										to={`/playground/${playground.id}${href}`}
									>
										<span className="nav-button-animate-icon">{icon}</span>
										<span>{text}</span>
									</Link>
								</li>
							))}
						</ul>
					</nav>
				</section>

				<section className="section-blur">
					<h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
						<Award className="h-5 w-5" />
						<span>Palmares</span>
					</h2>
					<nav>
						<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{palmaresList.length > 0 ? (
								palmaresList.map(({ year }) => (
									<li key={year}>
										<Link
											className={cn('nav-button', 'group justify-center')}
											to={`/playground/${playground.id}/palmares/${year}`}
										>
											<span className="nav-button-animate-text">
												Anno {year}
											</span>
										</Link>
									</li>
								))
							) : (
								<li className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
									🏅 Nessun palmares salvato per ora: si gioca per scrivere la
									storia.
								</li>
							)}
						</ul>
					</nav>
				</section>

				<section>
					<h2 className="mb-4 flex items-center justify-center gap-2 text-lg font-semibold">
						<span>Seguici sui social</span>
					</h2>
					<nav className="flex items-center justify-center gap-2">
						<ul className="grid grid-flow-col gap-2">
							<li>
								<Link
									aria-label="Apri Facebook del torneo"
									className="group inline-flex rounded-full p-1 transition-colors duration-200 hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
									to="https://www.facebook.com/Torneo3vs3Longara"
									target="_blank"
									rel="noreferrer"
								>
									<span className="transition-transform duration-200 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:scale-110">
										<FacebookIcon />
									</span>
								</Link>
							</li>
							<li>
								<Link
									aria-label="Apri Instagram del torneo"
									className="group inline-flex rounded-full p-1 transition-colors duration-200 hover:bg-pink-100 focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:outline-none"
									to="https://www.instagram.com/torneodilongara/"
									target="_blank"
									rel="noreferrer"
								>
									<span className="transition-transform duration-200 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:scale-110">
										<InstagramIcon />
									</span>
								</Link>
							</li>
						</ul>
					</nav>
				</section>
			</div>
		</main>
	)
}

const resources = [
	{
		href: '/calendar',
		text: 'Calendario partite',
		icon: <CalendarDays />,
	},
	{
		href: '/finals',
		text: 'Playoff',
		icon: <Trophy />,
	},
	{
		href: '/rankings-and-stats',
		text: 'Classifiche',
		icon: <Medal />,
	},
	{
		href: '/three-points-challenge-ranking',
		text: '3PT Challenge',
		icon: <Swords />,
	},
	{
		href: '/rules',
		text: 'Regolamento',
		icon: <BookOpenText />,
	},
]
