import { SCORE_INPUT_CLASS } from './edit-match-constants'
import { Input } from '~/components/ui/input'

type TeamSide = {
	id: string
	name: string
	score: number | null
}

type MatchScoresHeaderProps = {
	team1: TeamSide
	team2: TeamSide
}

export function MatchScoresHeader({ team1, team2 }: MatchScoresHeaderProps) {
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-x-2 gap-y-3 sm:gap-x-4 sm:gap-y-2">
				<div className="min-w-0 text-left">
					<p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase sm:text-xs">
						Squadra 1
					</p>
					<p className="mt-0.5 line-clamp-2 text-sm leading-tight font-bold text-slate-900 sm:mt-1 sm:text-lg">
						{team1.name}
					</p>
					<label className="mt-2 block sm:mt-3">
						<input hidden name="team1Id" defaultValue={team1.id} />
						<Input
							type="number"
							name="score1"
							defaultValue={team1.score ?? 0}
							className={SCORE_INPUT_CLASS}
							inputMode="numeric"
							required
						/>
					</label>
				</div>

				<div className="flex shrink-0 flex-col justify-end pb-1 sm:pb-2">
					<span className="rounded-full border border-slate-200/80 bg-slate-900/4 px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-slate-600 sm:px-4 sm:py-2 sm:text-sm">
						VS
					</span>
				</div>

				<div className="min-w-0 text-right">
					<p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase sm:text-xs">
						Squadra 2
					</p>
					<p className="mt-0.5 line-clamp-2 text-sm leading-tight font-bold text-slate-900 sm:mt-1 sm:text-lg">
						{team2.name}
					</p>
					<label className="mt-2 block sm:mt-3 sm:ml-auto sm:max-w-48">
						<input hidden name="team2Id" defaultValue={team2.id} />
						<Input
							type="number"
							name="score2"
							defaultValue={team2.score ?? 0}
							className={SCORE_INPUT_CLASS}
							inputMode="numeric"
							required
						/>
					</label>
				</div>
		</div>
	)
}
