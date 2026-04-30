import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Form, useLoaderData, useParams, useSubmit } from '@remix-run/react'
import { Flame } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { getTournamentHighlightsByDay } from '~/lib/highlights'
import { getDayLabel } from '~/lib/utils'
import { authSessionStorage } from '~/session.server'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [{ title: 'Highlights Torneo' }]
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const session = await authSessionStorage.getSession(
		request.headers.get('Cookie'),
	)
	const isAdmin = Boolean(session.get('isAdmin'))
	const url = new URL(request.url)
	const day = url.searchParams.get('day')
	const { highlights, availableDays, selectedDay } =
		await getTournamentHighlightsByDay(prisma, params.playgroundId, day)
	return { highlights, isAdmin, availableDays, selectedDay }
}

export default function HighlightsPage() {
	const { highlights, isAdmin, availableDays, selectedDay } =
		useLoaderData<typeof loader>()
	const params = useParams()
	const submit = useSubmit()
	const backLink = isAdmin
		? `/playground/${params.playgroundId}`
		: `/playground/${params.playgroundId}/menu`

	return (
		<div className="mx-auto max-w-lg space-y-4 p-4">
			<Header title="Highlights Torneo" backLink={backLink} icon={<Flame />} />

			<section className="section-blur">
				<div className="grid gap-3 md:grid-cols-[1fr_220px] md:items-end">
					<div className="space-y-1">
						<p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
							Giornata selezionata
						</p>
						<p className="text-sm font-semibold text-slate-900">
							{selectedDay
								? `${getDayLabel(selectedDay.toString())} · Giorno ${selectedDay}`
								: 'Nessuna giornata disponibile'}
						</p>
					</div>
					{availableDays.length > 0 ? (
						<Form method="get" className="w-full">
							<label
								htmlFor="day-select"
								className="mb-1 block text-xs text-slate-500"
							>
								Cambia giornata
							</label>
							<Select
								defaultValue={selectedDay?.toString()}
								onValueChange={(value) => {
									submit({ day: value }, { method: 'get' })
								}}
							>
								<SelectTrigger id="day-select" className="w-full bg-white">
									<SelectValue placeholder="Seleziona giornata" />
								</SelectTrigger>
								<SelectContent>
									{availableDays.map((day) => (
										<SelectItem key={day} value={day.toString()}>
											{getDayLabel(day.toString())} - Giorno {day}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Form>
					) : null}
				</div>
			</section>

			<section className="section-blur highlights-card-v2 pt-2">
				<div
					aria-hidden="true"
					className="menu-hero-overlay-v2 pointer-events-none absolute inset-0"
				/>
				<div
					aria-hidden="true"
					className="menu-hero-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
				/>
				<div className="relative">
					<div className="mb-2 flex items-center gap-1 place-self-center rounded-full px-2 py-0.5 font-semibold tracking-wide text-rose-950">
						<Flame className="h-3.5 w-3.5 shrink-0" />
						Highlights
					</div>
					<div className="mb-3 rounded-xl border border-slate-300/80 bg-white/80 px-4 py-3">
						<p className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
							{selectedDay
								? `${getDayLabel(selectedDay.toString())} · Giorno ${selectedDay}`
								: 'Giornata non disponibile'}
						</p>

						<p className="mt-1 text-base font-extrabold tracking-tight text-slate-950 md:text-lg">
							<span aria-hidden="true">🏀</span> Torneo 3vs3 Longara
						</p>
					</div>
					{highlights.length > 0 ? (
						<ul className="space-y-2">
							{highlights.map((highlight) => (
								<li
									key={highlight.key}
									className="rounded-lg border border-rose-300/80 bg-rose-50/85 p-3"
								>
									<p className="text-xs font-semibold tracking-wide text-rose-900 uppercase">
										{highlight.icon} {highlight.title}
									</p>
									<p className="mt-1 text-sm font-semibold text-slate-950">
										{highlight.text}
									</p>
									<p className="mt-1 text-xs text-slate-700">{highlight.meta}</p>
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-slate-800">
							Ancora pochi risultati disponibili: i momenti salienti compariranno
							man mano che si gioca.
						</p>
					)}
				</div>
			</section>
		</div>
	)
}
