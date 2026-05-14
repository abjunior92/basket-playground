import { Circle } from 'lucide-react'
import { useState } from 'react'
import { cn } from '~/lib/utils'

type MatchTeamFoulsGridProps = {
	team1Id: string
	team2Id: string
}

export function MatchTeamFoulsGrid({ team1Id, team2Id }: MatchTeamFoulsGridProps) {
	const [teamFouls, setTeamFouls] = useState<Record<string, number>>({
		[team1Id]: 0,
		[team2Id]: 0,
	})

	const handleFoulClick = (teamId: string, foulNumber: number) => {
		setTeamFouls((prev) => ({
			...prev,
			[teamId]: prev[teamId] === foulNumber ? foulNumber - 1 : foulNumber,
		}))
	}

	const renderFoulDots = (teamId: string) => {
		return Array.from({ length: 6 }, (_, i) => {
			const isFilled = (teamFouls[teamId] || 0) > i
			const isBonus = i === 5 && (teamFouls[teamId] || 0) === 6

			return (
				<button
					key={i}
					type="button"
					onClick={() => handleFoulClick(teamId, i + 1)}
					className={cn(
						'rounded-full p-px transition-colors duration-200 active:scale-95 md:p-1',
						isBonus
							? 'text-red-600 hover:bg-red-50 hover:text-red-700'
							: isFilled
								? 'text-slate-800 hover:bg-orange-50 hover:text-orange-800'
								: 'text-slate-300 hover:bg-slate-100 hover:text-slate-500',
					)}
				>
					<Circle
						className={cn(
							'h-5 w-5 md:h-6 md:w-6',
							isFilled ? 'fill-current' : '',
							'stroke-current',
						)}
					/>
				</button>
			)
		})
	}

	return (
		<div className="grid grid-cols-2 border-t border-slate-200/80 pt-4 sm:pt-6">
			<div className="flex min-w-0 flex-col items-start">
				<span className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase sm:text-xs">
					Falli squadra
				</span>
				<div className="mt-2 flex max-w-full flex-wrap gap-0.5">
					{renderFoulDots(team1Id)}
				</div>
			</div>

			<div className="flex min-w-0 flex-col items-end border-l border-slate-200/70">
				<span className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase sm:text-xs">
					Falli squadra
				</span>
				<div className="mt-2 flex max-w-full flex-wrap justify-end gap-0.5">
					{renderFoulDots(team2Id)}
				</div>
			</div>
		</div>
	)
}
