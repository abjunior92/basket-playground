import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData, useParams } from '@remix-run/react'
import { ChevronRight, Shield, Users } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { colorGroupClasses } from '~/lib/types'
import { cn } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Squadre' },
		{ name: 'description', content: 'Elenco squadre del torneo' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')

	const playground = await prisma.playground.findUnique({
		where: { id: params.playgroundId },
		select: { id: true, name: true },
	})
	if (!playground) {
		throw new Response('Playground non trovato', { status: 404 })
	}

	const teams = await prisma.team.findMany({
		where: { playgroundId: params.playgroundId },
		include: {
			group: true,
			_count: { select: { players: true } },
		},
		orderBy: [{ group: { name: 'asc' } }, { name: 'asc' }],
	})

	return {
		playground,
		teams: teams.map((t) => ({
			id: t.id,
			name: t.name,
			groupName: t.group.name,
			groupColor: t.group.color,
			playersCount: t._count.players,
		})),
	}
}

export default function GuestTeamsIndex() {
	const { playground, teams } = useLoaderData<typeof loader>()
	const { playgroundId } = useParams()
	const teamsReturnPath = `/playground/${playgroundId}/teams`

	return (
		<div className="mx-auto max-w-lg space-y-4 p-4 pb-10">
			<Header
				title="Squadre"
				backLink={`/playground/${playgroundId}/menu`}
				icon={<Users />}
			/>

			<section className="section-blur">
				<p className="text-sm text-slate-600">{playground.name}</p>
				<h2 className="mt-1 text-xl font-bold text-slate-900">
					Tutte le squadre
				</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-700">
					Tocca una squadra per aprire statistiche, roster e ultimi risultati.
				</p>
			</section>

			{teams.length === 0 ? (
				<section className="section-blur">
					<p className="text-sm text-slate-700">
						Non risultano squadre iscritte a questo torneo.
					</p>
				</section>
			) : (
				<ul className="grid gap-3 sm:grid-cols-2">
					{teams.map((team) => (
						<li key={team.id}>
							<Link
								to={`/playground/${playgroundId}/team/${team.id}?returnTo=${encodeURIComponent(teamsReturnPath)}`}
								className={cn(
									'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-linear-to-br from-white/95 to-slate-50/90 p-4 shadow-sm',
									'transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-orange-200/80 motion-safe:hover:shadow-md',
									'focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:outline-none',
								)}
							>
								<div
									aria-hidden="true"
									className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-400/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 motion-safe:group-hover:scale-110"
								/>
								<div className="relative flex flex-1 flex-col gap-3">
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
														{team.playersCount}{' '}
														{team.playersCount === 1 ? 'giocatore' : 'giocatori'}
													</span>
												</p>
											</div>
										</div>
										<ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-orange-600" />
									</div>
									<Badge
										className={cn(
											'w-fit border border-white/40 text-xs font-medium text-white shadow-sm',
											colorGroupClasses[team.groupColor],
										)}
									>
										{team.groupName}
									</Badge>
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
