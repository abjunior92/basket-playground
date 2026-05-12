import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Form, useLoaderData, useParams, useSubmit } from '@remix-run/react'
import { Download, Flame, Loader2, Scale, Star, Target } from 'lucide-react'
import { useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import {
	createHighlightsImageDataUrl,
	downloadDataUrl,
	getHighlightsImageFileName,
} from '~/lib/highlight-image-download'
import { getHighlightPresentation } from '~/lib/highlight-presentation'
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
	const highlightsCardRef = useRef<HTMLElement>(null)
	const [downloadStatus, setDownloadStatus] = useState<
		'idle' | 'saving' | 'done' | 'error'
	>('idle')
	const backLink = isAdmin
		? `/playground/${params.playgroundId}`
		: `/playground/${params.playgroundId}/menu`

	const iconByHighlightPresentation = {
		flame: Flame,
		scale: Scale,
		star: Star,
		target: Target,
	}

	const handleDownloadHighlights = async () => {
		if (!highlightsCardRef.current || downloadStatus === 'saving') {
			return
		}

		setDownloadStatus('saving')

		try {
			const { toPng } = await import('html-to-image')
			const dataUrl = await createHighlightsImageDataUrl(
				highlightsCardRef.current,
				toPng,
			)
			downloadDataUrl({
				dataUrl,
				document: window.document,
				fileName: getHighlightsImageFileName(selectedDay),
			})
			setDownloadStatus('done')
		} catch (error) {
			console.error("Errore durante il download dell'immagine:", error)
			setDownloadStatus('error')
		}
	}

	const downloadStatusMessage =
		downloadStatus === 'saving'
			? 'Sto preparando il PNG degli highlights.'
			: downloadStatus === 'done'
				? 'Immagine salvata: pronta per essere condivisa nelle storie.'
				: downloadStatus === 'error'
					? "Non sono riuscito a salvare l'immagine. Riprova tra poco."
					: 'Scarica una card PNG pronta per le storie social.'

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

			<section className="section-blur space-y-3">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-1">
						<p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
							Condivisione social
						</p>
						<p
							id="highlights-download-status"
							className="text-sm text-slate-700"
							aria-live="polite"
						>
							{downloadStatusMessage}
						</p>
					</div>
					<Button
						type="button"
						variant="default"
						onClick={handleDownloadHighlights}
						disabled={downloadStatus === 'saving' || highlights.length === 0}
						aria-describedby="highlights-download-status"
					>
						{downloadStatus === 'saving' ? (
							<Loader2 className="animate-spin" aria-hidden="true" />
						) : (
							<Download aria-hidden="true" />
						)}
						{downloadStatus === 'saving'
							? 'Preparo immagine'
							: 'Scarica immagine'}
					</Button>
				</div>
			</section>

			<section
				ref={highlightsCardRef}
				className="section-blur highlights-card-v2 pt-2"
				aria-busy={downloadStatus === 'saving'}
			>
				<div
					aria-hidden="true"
					className="menu-hero-overlay-v2 pointer-events-none absolute inset-0"
				/>
				<div
					aria-hidden="true"
					className="menu-hero-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
				/>
				<div className="relative space-y-3">
					<div className="flex items-center justify-center gap-3">
						<p className="text-xs font-bold tracking-[0.2em] text-rose-950 uppercase">
							Highlights
						</p>
					</div>
					<div className="highlight-social-cover">
						<p className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
							{selectedDay
								? `${getDayLabel(selectedDay.toString())} · Giorno ${selectedDay}`
								: 'Giornata non disponibile'}
						</p>

						<p className="mt-1 text-xl leading-tight font-extrabold tracking-tight text-slate-950 md:text-2xl">
							<span aria-hidden="true">🏀</span> Torneo 3vs3 Longara
						</p>
					</div>
					{highlights.length > 0 ? (
						<ul className="grid gap-3">
							{highlights.map((highlight, index) => {
								const presentation = getHighlightPresentation(highlight.key)
								const Icon = iconByHighlightPresentation[presentation.icon]
								return (
									<li
										key={highlight.key}
										className={`highlight-social-item highlight-social-item--${presentation.tone}`}
									>
										<div
											aria-hidden="true"
											className="highlight-social-watermark"
										>
											<Icon className="h-20 w-20 stroke-[1.1] sm:h-24 sm:w-24" />
										</div>
										<div className="relative z-10 flex w-full flex-col text-left">
											<div className="mb-3 flex items-center justify-between gap-3">
												<span className="highlight-social-badge">
													<Icon className="h-3.5 w-3.5 shrink-0" />
													{presentation.label}
												</span>
												<span className="highlight-social-number">
													{String(index + 1).padStart(2, '0')}
												</span>
											</div>
											<p className="highlight-social-title">
												{highlight.title}
											</p>
											<p
												className="highlight-social-copy"
												dangerouslySetInnerHTML={{ __html: highlight.text }}
											/>
											<p className="highlight-social-meta">{highlight.meta}</p>
										</div>
									</li>
								)
							})}
						</ul>
					) : (
						<p className="text-sm text-slate-800">
							Ancora pochi risultati disponibili: i momenti salienti
							compariranno man mano che si gioca.
						</p>
					)}
				</div>
			</section>
		</div>
	)
}
