import { PrismaClient } from '@prisma/client'
import { json, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import {
	ChevronRight,
	ExternalLink,
	LayoutGrid,
	Shield,
	Trophy,
	Users,
} from 'lucide-react'
import { GlowCardLink } from '~/components/GlowCardLink'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { colorGroupClasses } from '~/lib/types'
import { cn } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Panoramica Tornei' },
		{ name: 'description', content: 'Panoramica Tornei' },
	]
}

export const loader = async () => {
	const playgrounds = await prisma.playground.findMany({
		orderBy: { name: 'asc' },
		include: {
			groups: {
				orderBy: { name: 'asc' },
				include: {
					teams: {
						orderBy: { name: 'asc' },
						include: {
							players: {
								orderBy: [{ surname: 'asc' }, { name: 'asc' }],
							},
						},
					},
				},
			},
		},
	})

	return json({ playgrounds })
}

export default function TournamentOverview() {
	const { playgrounds } = useLoaderData<typeof loader>()

	return (
		<div className="mx-auto max-w-5xl space-y-6 p-4 pb-12 md:p-6">
			<Header title="Panoramica tornei" backLink="/" icon={<Trophy />} />

			<section className="section-blur">
				<h2 className="text-lg font-bold text-slate-900">Tutti i tornei</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-700">
					Vista d&apos;insieme di gironi, squadre e roster. Tocca un girone per
					aprire la gestione del girone, oppure una squadra per modificare
					giocatori e dati della squadra.
				</p>
			</section>

			{playgrounds.length === 0 ? (
				<section className="section-blur">
					<p className="text-sm text-slate-700">Nessun torneo disponibile.</p>
				</section>
			) : (
				<ul className="space-y-8">
					{playgrounds.map((playground) => {
						const teamCount = playground.groups.reduce(
							(n, g) => n + g.teams.length,
							0,
						)
						const playerCount = playground.groups.reduce(
							(n, g) =>
								n + g.teams.reduce((m, t) => m + t.players.length, 0),
							0,
						)

						return (
							<li key={playground.id}>
								<article className="section-blur space-y-6">
									<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
										<div className="min-w-0">
											<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
												Torneo
											</p>
											<h3 className="mt-1 text-2xl font-bold leading-tight text-slate-900">
												{playground.name}
											</h3>
											<p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
												<span>
													{playground.groups.length}{' '}
													{playground.groups.length === 1
														? 'girone'
														: 'gironi'}
												</span>
												<span>
													{teamCount}{' '}
													{teamCount === 1 ? 'squadra' : 'squadre'}
												</span>
												<span>
													{playerCount}{' '}
													{playerCount === 1 ? 'giocatore' : 'giocatori'}
												</span>
											</p>
										</div>
										<Button
											asChild
											variant="outline"
											className="shrink-0 border-slate-200 bg-white/80 shadow-sm"
										>
											<Link
												to={`/playgrounds/${playground.id}`}
												className="gap-2"
											>
												<span>Gestione torneo</span>
												<ExternalLink className="h-4 w-4 opacity-70" />
											</Link>
										</Button>
									</div>

									{playground.groups.length === 0 ? (
										<p className="text-sm text-slate-700">
											Nessun girone definito per questo torneo.
										</p>
									) : (
										<ul className="space-y-8">
											{playground.groups.map((group) => (
												<li key={group.id}>
													<div className="rounded-2xl border border-slate-200/80 bg-white/50 p-4 shadow-inner ring-1 ring-slate-900/5 sm:p-5">
														<Link
															to={`/playgrounds/${playground.id}/groups/${group.id}`}
															className={cn(
																'group mb-4 flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors',
																'motion-safe:hover:border-slate-200/90 motion-safe:hover:bg-white/70',
																'focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:outline-none',
															)}
														>
															<div className="flex min-w-0 flex-1 items-center gap-3">
																<span
																	className={cn(
																		'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900/5 text-slate-800',
																		'transition-colors duration-200 group-hover:bg-orange-500/15 group-hover:text-orange-900',
																	)}
																>
																	<LayoutGrid className="h-5 w-5" />
																</span>
																<div className="min-w-0">
																	<p className="text-xs font-medium text-slate-500">
																		Girone
																	</p>
																	<div className="mt-1 flex flex-wrap items-center gap-2">
																		<span className="truncate text-base font-semibold text-slate-900">
																			{group.name}
																		</span>
																		<Badge
																			className={cn(
																				'shrink-0 border border-white/40 text-xs font-medium text-white shadow-sm',
																				colorGroupClasses[group.color],
																			)}
																		>
																			{group.teams.length}{' '}
																			{group.teams.length === 1
																				? 'squadra'
																				: 'squadre'}
																		</Badge>
																	</div>
																</div>
															</div>
															<ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-orange-600" />
														</Link>

														{group.teams.length === 0 ? (
															<p className="px-2 text-sm text-slate-600">
																Nessuna squadra in questo girone.
															</p>
														) : (
															<ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
																{group.teams.map((team) => (
																	<li key={team.id}>
																		<GlowCardLink
																			to={`/playgrounds/${playground.id}/teams/${team.id}`}
																			className="min-h-32"
																		>
																			<div className="flex items-start justify-between gap-2">
																				<div className="flex min-w-0 flex-1 items-start gap-2">
																					<span
																						className={cn(
																							'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900/5 text-slate-800',
																							'transition-colors duration-200 group-hover:bg-orange-500/15 group-hover:text-orange-900',
																						)}
																					>
																						<Shield className="h-4 w-4" />
																					</span>
																					<div className="min-w-0">
																						<p className="font-semibold leading-snug text-slate-900">
																							{team.name}
																						</p>
																						<p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
																							<Users className="h-3.5 w-3.5 shrink-0 opacity-80" />
																							<span>
																								{team.players.length}{' '}
																								{team.players.length === 1
																									? 'giocatore'
																									: 'giocatori'}
																							</span>
																						</p>
																					</div>
																				</div>
																				<ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-orange-600" />
																			</div>
																			{team.players.length === 0 ? (
																				<p className="text-xs text-slate-500">
																					Nessun giocatore in rosa.
																				</p>
																			) : (
																				<div className="flex min-h-0 flex-1 flex-wrap content-start gap-1.5 border-t border-slate-200/80 pt-3">
																					{team.players.map((player) => {
																						const label = `${player.name} ${player.surname}`
																						const inactive =
																							player.retired ||
																							player.isExpelled
																						return (
																							<span
																								key={player.id}
																								title={label}
																								className={cn(
																									'max-w-full truncate rounded-full border border-slate-200/80 bg-slate-900/4 px-2 py-0.5 text-xs text-slate-700',
																									inactive &&
																										'border-amber-200/80 bg-amber-50/90 text-slate-500 line-through decoration-slate-400',
																								)}
																							>
																								{player.name}{' '}
																								<span className="font-medium text-slate-800">
																									{player.surname}
																								</span>
																							</span>
																						)
																					})}
																				</div>
																			)}
																		</GlowCardLink>
																	</li>
																))}
															</ul>
														)}
													</div>
												</li>
											))}
										</ul>
									)}
								</article>
							</li>
						)
					})}
				</ul>
			)}
		</div>
	)
}
