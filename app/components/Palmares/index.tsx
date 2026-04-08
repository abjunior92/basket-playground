import { type TournamentPalmares } from '@prisma/client'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '~/components/ui/accordion'

type PalmaresData = Omit<TournamentPalmares, 'savedAt' | 'updatedAt'> & {
	savedAt: string | Date
	updatedAt: string | Date
}

const Palmares = ({ palmares }: { palmares: PalmaresData }) => {
	const podium = [
		{
			label: '1',
			team: palmares.firstTeamName,
			players: palmares.firstTeamPlayers,
			style: 'bg-amber-50 text-amber-900 border-amber-200',
		},
		{
			label: '2',
			team: palmares.secondTeamName,
			players: palmares.secondTeamPlayers,
			style: 'bg-slate-100 text-slate-800 border-slate-200',
		},
		{
			label: '3',
			team: palmares.thirdTeamName,
			players: palmares.thirdTeamPlayers,
			style: 'bg-orange-50 text-orange-900 border-orange-200',
		},
	]

	const getPlayerTeam = (name: string, surname: string) => {
		const fullName = `${name} ${surname}`.trim().toLowerCase()
		const normalizedFullName = fullName.replace(/\s+/g, ' ')

		const team = podium.find(({ players }) =>
			players.some((player) => player.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedFullName),
		)

		return team?.team ?? 'N/D'
	}

	const bestGroupScorerTeam =
		palmares.bestGroupScorerTeamName ??
		getPlayerTeam(palmares.bestGroupScorerName, palmares.bestGroupScorerSurname)
	const bestFinalsScorerTeam =
		palmares.bestFinalsScorerTeamName ??
		getPlayerTeam(palmares.bestFinalsScorerName, palmares.bestFinalsScorerSurname)

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
					<Accordion type="single" collapsible className="mt-4 space-y-2">
						{podium.map((team) => (
							<AccordionItem
								key={team.label}
								value={team.label}
								className={`rounded-lg border px-3 ${team.style}`}
							>
								<AccordionTrigger className="gap-3 py-2 hover:no-underline">
									<div className="flex items-center gap-3">
										<span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-sm font-bold">
											{team.label}
										</span>
										<p className="text-sm font-medium">{team.team}</p>
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<ul className="space-y-1 pb-2 pl-10 text-sm">
										{team.players.map((player) => (
											<li key={player}>{player}</li>
										))}
									</ul>
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
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
								{palmares.bestGroupScorerName} {palmares.bestGroupScorerSurname} ({bestGroupScorerTeam})
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
								{palmares.bestFinalsScorerSurname} ({bestFinalsScorerTeam})
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
