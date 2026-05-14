import { Form } from '@remix-run/react'
import { PLANNER_SELECT_CLASS } from './edit-match-constants'
import { type EditMatchGroupForPlanner } from './types'
import ErrorMessage from '~/components/ErrorMessage'
import { Button } from '~/components/ui/button'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { cn, getDayLabel } from '~/lib/utils'

type ReplanMatchFormProps = {
	backLink: string
	match: {
		day: number
		timeSlot: string
		field: string
		team1Id: string
		team2Id: string
	}
	timeSlots: string[]
	groups: EditMatchGroupForPlanner[]
	replanError?: string
	isSubmitting: boolean
}

export function ReplanMatchForm({
	backLink,
	match,
	timeSlots,
	groups,
	replanError,
	isSubmitting,
}: ReplanMatchFormProps) {
	return (
		<>
			<section className="section-blur">
				<h2 className="text-lg font-bold text-slate-900">Ripianifica partita</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-700">
					Sposta giorno, orario, campo o accoppiata squadre. Non è possibile se è
					già stato inserito un risultato.
				</p>
			</section>

			<Form
				method="post"
				className="mt-5 grid w-full grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-5"
			>
				<input type="hidden" name="backLink" value={backLink} />
				<div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-inner ring-1 ring-slate-900/5 sm:p-5">
					<label
						htmlFor="day"
						className="text-xs font-semibold tracking-wide text-slate-600 uppercase"
					>
						Giorno
					</label>
					<Select name="day" defaultValue={`${match.day}`}>
						<SelectTrigger id="day" className={cn('mt-2', PLANNER_SELECT_CLASS)}>
							<SelectValue placeholder="Seleziona un giorno" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Giorno</SelectLabel>
								{['1', '2', '3', '4', '5', '6', '7'].map((d) => (
									<SelectItem key={d} value={d}>
										{getDayLabel(d)}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>

				<div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-inner ring-1 ring-slate-900/5 sm:p-5">
					<label
						htmlFor="timeSlot"
						className="text-xs font-semibold tracking-wide text-slate-600 uppercase"
					>
						Orario
					</label>
					<Select name="timeSlot" defaultValue={match.timeSlot}>
						<SelectTrigger
							id="timeSlot"
							className={cn('mt-2', PLANNER_SELECT_CLASS)}
						>
							<SelectValue placeholder="Seleziona un orario" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Orario</SelectLabel>
								{timeSlots.map((slot) => (
									<SelectItem key={slot} value={slot}>
										{slot}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>

				<div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-inner ring-1 ring-slate-900/5 sm:p-5">
					<label
						htmlFor="field"
						className="text-xs font-semibold tracking-wide text-slate-600 uppercase"
					>
						Campo
					</label>
					<Select name="field" defaultValue={match.field}>
						<SelectTrigger id="field" className={cn('mt-2', PLANNER_SELECT_CLASS)}>
							<SelectValue placeholder="Seleziona un campo" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Campo</SelectLabel>
								{['A', 'B'].map((field) => (
									<SelectItem key={field} value={field}>
										{field}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>

				<div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-inner ring-1 ring-slate-900/5 sm:p-5">
					<label
						htmlFor="team1Id"
						className="text-xs font-semibold tracking-wide text-slate-600 uppercase"
					>
						Squadra 1
					</label>
					<Select name="team1Id" defaultValue={match.team1Id}>
						<SelectTrigger
							id="team1Id"
							className={cn('mt-2', PLANNER_SELECT_CLASS)}
						>
							<SelectValue placeholder="Seleziona una squadra" />
						</SelectTrigger>
						<SelectContent>
							{groups.map((g) => (
								<SelectGroup key={g.id}>
									<SelectLabel>{g.name}</SelectLabel>
									{g.teams.map((t) => (
										<SelectItem key={t.id} value={t.id}>
											{t.name}
										</SelectItem>
									))}
								</SelectGroup>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-inner ring-1 ring-slate-900/5 sm:p-5">
					<label
						htmlFor="team2Id"
						className="text-xs font-semibold tracking-wide text-slate-600 uppercase"
					>
						Squadra 2
					</label>
					<Select name="team2Id" defaultValue={match.team2Id}>
						<SelectTrigger
							id="team2Id"
							className={cn('mt-2', PLANNER_SELECT_CLASS)}
						>
							<SelectValue placeholder="Seleziona una squadra avversaria" />
						</SelectTrigger>
						<SelectContent>
							{groups.map((g) => (
								<SelectGroup key={g.id}>
									<SelectLabel>{g.name}</SelectLabel>
									{g.teams.map((t) => (
										<SelectItem key={t.id} value={t.id}>
											{t.name}
										</SelectItem>
									))}
								</SelectGroup>
							))}
						</SelectContent>
					</Select>
				</div>

				<Button
					type="submit"
					name="intent"
					value="replan"
					className="h-11 w-full font-semibold md:col-span-2 md:w-auto md:justify-self-start"
					disabled={isSubmitting}
				>
					Ripianifica partita
				</Button>
				{replanError && (
					<div className="md:col-span-2">
						<ErrorMessage message={replanError} />
					</div>
				)}
			</Form>
		</>
	)
}
