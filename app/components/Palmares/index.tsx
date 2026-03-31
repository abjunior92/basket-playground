import { type TournamentPalmares } from '@prisma/client'

type PalmaresData = Omit<TournamentPalmares, 'savedAt' | 'updatedAt'> & {
	savedAt: string | Date
	updatedAt: string | Date
}

const Palmares = ({ palmares }: { palmares: PalmaresData }) => {
	const podium = [
		{ label: '1', team: palmares.firstTeamName, style: 'bg-amber-50 text-amber-900 border-amber-200' },
		{ label: '2', team: palmares.secondTeamName, style: 'bg-slate-100 text-slate-800 border-slate-200' },
		{ label: '3', team: palmares.thirdTeamName, style: 'bg-orange-50 text-orange-900 border-orange-200' },
	]

	return (
		<div className="space-y-4">
			<div className="rounded-xl border bg-card/95 p-4 shadow-sm">
				<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Torneo
				</p>
				<p className="mt-1 text-lg leading-tight font-semibold text-card-foreground sm:text-xl">
					{palmares.tournamentName ?? 'Edizione storica'}
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<section className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
					<h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
						Podio
					</h2>
					<div className="mt-4 space-y-2">
						{podium.map((team) => (
							<div
								key={team.label}
								className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${team.style}`}
							>
								<span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-sm font-bold">
									{team.label}
								</span>
								<p className="text-sm font-medium">{team.team}</p>
							</div>
						))}
					</div>
				</section>

				<section className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
					<h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
						Top scorer
					</h2>
					<div className="mt-4 space-y-3">
						<div className="rounded-lg bg-muted/50 p-3">
							<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								Gironi
							</p>
							<p className="mt-1 text-sm font-semibold">
								{palmares.bestGroupScorerName} {palmares.bestGroupScorerSurname}
							</p>
							<p className="text-sm text-muted-foreground">
								{palmares.bestGroupScorerPoints} pt
							</p>
						</div>

						<div className="rounded-lg bg-muted/50 p-3">
							<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								Finali
							</p>
							<p className="mt-1 text-sm font-semibold">
								{palmares.bestFinalsScorerName}{' '}
								{palmares.bestFinalsScorerSurname}
							</p>
							<p className="text-sm text-muted-foreground">
								{palmares.bestFinalsScorerPoints} pt
							</p>
						</div>
					</div>
				</section>
			</div>
		</div>
	)
}

export default Palmares
