import { Ambulance, Minus, Plus } from 'lucide-react'
import {
	PLAYER_POINTS_INPUT_CLASS,
	PLAYER_STEP_BTN_CLASS,
	PLAYER_STEP_ICON_CLASS,
} from './edit-match-constants'
import { MatchPlayerOptionsMenu } from './MatchPlayerOptionsMenu'
import { type EditMatchPlayerForCard, type TeamPlayersFieldName } from './types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

type MatchPlayerScoreCardProps = {
	player: EditMatchPlayerForCard
	matchId: string
	teamPlayersFieldName: TeamPlayersFieldName
	defaultPoints: number
	aliasDisplay: string
	onOpenAliasDialog: (playerId: string) => void
}

export function MatchPlayerScoreCard({
	player,
	matchId,
	teamPlayersFieldName,
	defaultPoints,
	aliasDisplay,
	onOpenAliasDialog,
}: MatchPlayerScoreCardProps) {
	return (
		<div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">
			<label htmlFor={`player-${player.id}`} className="block cursor-pointer">
				<div className="flex items-center justify-between gap-1.5 border-b border-slate-200/80 bg-linear-to-r from-slate-50/90 to-white px-2 py-2 sm:gap-2 sm:px-3 sm:py-2.5">
					<div className="flex flex-col">
						<span className="text-[11px] leading-tight text-slate-600 sm:text-xs">
							{player.name}
						</span>
						<span className="text-sm leading-tight font-semibold text-slate-900 sm:text-base">
							{player.surname}
						</span>
					</div>
					<div>
						{player.warnings === 1 && '🟨 '}
						{player.isExpelled && '🟥 '}
						{player.retired && <Ambulance className="h-4 w-4" />}
					</div>
				</div>
				<input hidden name={teamPlayersFieldName} defaultValue={player.id} />
				<div className="flex flex-col gap-2 rounded-b-2xl border border-t-0 border-slate-200/80 bg-slate-50/60 p-2 sm:gap-3 sm:p-3">
					<p className="text-xs leading-relaxed text-slate-600">
						<span className="font-medium text-slate-700">Alias:</span> {aliasDisplay}
					</p>
					<div className="flex min-w-0 items-center gap-1 sm:gap-2">
						<Button
							variant="destructive"
							type="button"
							size="icon"
							aria-label="Sottrai"
							className={PLAYER_STEP_BTN_CLASS}
							onClick={(e) => {
								e.preventDefault()
								const input = e.currentTarget.nextElementSibling as HTMLInputElement
								if (input) {
									const currentValue = parseInt(input.value) || 0
									input.value = Math.max(0, currentValue - 1).toString()
								}
							}}
						>
							<Minus className={PLAYER_STEP_ICON_CLASS} />
						</Button>
						<Input
							type="number"
							id={`player-${player.id}`}
							name={`player-${player.id}`}
							className={PLAYER_POINTS_INPUT_CLASS}
							inputMode="numeric"
							min="0"
							defaultValue={defaultPoints}
						/>
						<Button
							variant="success"
							type="button"
							size="icon"
							aria-label="Aggiungi"
							className={PLAYER_STEP_BTN_CLASS}
							onClick={(e) => {
								e.preventDefault()
								const input = e.currentTarget
									.previousElementSibling as HTMLInputElement
								if (input) {
									const currentValue = parseInt(input.value) || 0
									input.value = Math.max(0, currentValue + 1).toString()
								}
							}}
						>
							<Plus className={PLAYER_STEP_ICON_CLASS} />
						</Button>
					</div>
					<MatchPlayerOptionsMenu
						player={player}
						matchId={matchId}
						onOpenAliasDialog={() => onOpenAliasDialog(player.id)}
					/>
				</div>
			</label>
		</div>
	)
}
