import { type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { FacebookIcon } from 'icons/lucide-facebook'
import { InstagramIcon } from 'icons/lucide-instagram'
import {
	ArrowDown,
	ArrowRight,
	Award,
	Beer,
	Bus,
	CalendarClock,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	ClipboardCheck,
	Clock,
	Crosshair,
	Crown,
	CupSoda,
	Flag,
	Flame,
	GlassWater,
	Globe,
	Camera,
	HandPlatter,
	Heart,
	HeartHandshake,
	ImageDown,
	Images,
	Info,
	MapPin,
	Medal,
	Megaphone,
	Moon,
	PartyPopper,
	ShieldCheck,
	Sparkles,
	Star,
	Swords,
	Target,
	Trophy,
	Users,
	UtensilsCrossed,
	Wallet,
	Zap,
	type LucideIcon,
} from 'lucide-react'
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
} from 'react'
import { EventVenueMap } from '~/components/EventVenueMap'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '~/components/ui/accordion'
import { prisma } from '~/db.server'
import { cn } from '~/lib/utils'

export const meta: MetaFunction = () => {
	return [
		{ title: 'Bacheca Torneo Longara' },
		{
			name: 'description',
			content:
				'Pagina bacheca del Torneo di Longara con info utili, sponsor, cibo e aggiornamenti.',
		},
	]
}

export const loader = async () => {
	const playground = await prisma.playground.findFirst({
		orderBy: [{ year: 'desc' }, { name: 'asc' }],
		select: { id: true, name: true, year: true },
	})

	/** Link richiesta pagamento Satispay (solo reindirizzamento; nessun pagamento in-app). */
	const satispayPaymentUrl =
		process.env.PUBLIC_SATISPAY_PAYMENT_URL?.trim() || null

	/**
	 * La sezione "Novità" (iscrizioni) resta visibile solo fino al via del torneo:
	 * dal 28 giugno in poi viene nascosta. Mese 5 = giugno (0-based).
	 */
	const newsCutoffYear = playground?.year ?? new Date().getFullYear()
	const showNews = new Date() < new Date(newsCutoffYear, 5, 28)

	return { playground, satispayPaymentUrl, showNews }
}

const showcaseAccordionSections = [
	'organization',
	'prizes',
	'food',
	'photos',
] as const

type ShowcaseAccordionSectionProps = {
	value: string
	icon: LucideIcon
	title: string
	description?: string
	children: ReactNode
	/** Ancora per il table of contents (scroll dall'header). */
	id?: string
}

function ShowcaseAccordionSection({
	value,
	icon: Icon,
	title,
	description,
	children,
	id,
}: ShowcaseAccordionSectionProps) {
	return (
		<AccordionItem
			value={value}
			id={id}
			className={cn(
				'section-blur',
				'highlights-card-v1',
				'relative scroll-mt-4 border-none',
			)}
		>
			<div
				aria-hidden="true"
				className="menu-hero-overlay-v1 pointer-events-none absolute inset-0"
			/>
			<div
				aria-hidden="true"
				className="menu-hero-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
			/>
			<div className="relative">
				<AccordionTrigger className="cursor-pointer gap-2 py-0 text-lg font-semibold text-slate-900 hover:no-underline [&>svg]:text-slate-600">
					<span className="flex items-center gap-2">
						<Icon className="h-5 w-5 shrink-0" aria-hidden />
						{title}
					</span>
				</AccordionTrigger>
				<AccordionContent className="pt-4">
					{description ? (
						<p className="mb-3 text-sm text-slate-800">{description}</p>
					) : null}
					{children}
				</AccordionContent>
			</div>
		</AccordionItem>
	)
}

type TocItem = {
	id: string
	label: string
	icon: LucideIcon
}

const prefersReducedMotion = () =>
	typeof window !== 'undefined' &&
	window.matchMedia('(prefers-reduced-motion: reduce)').matches

function ShowcaseTableOfContents({ items }: { items: TocItem[] }) {
	const scrollerRef = useRef<HTMLUListElement>(null)
	const [canScrollLeft, setCanScrollLeft] = useState(false)
	const [canScrollRight, setCanScrollRight] = useState(false)

	const updateArrows = useCallback(() => {
		const el = scrollerRef.current
		if (!el) return
		const { scrollLeft, scrollWidth, clientWidth } = el
		setCanScrollLeft(scrollLeft > 1)
		setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
	}, [])

	useEffect(() => {
		updateArrows()
		window.addEventListener('resize', updateArrows)
		return () => window.removeEventListener('resize', updateArrows)
	}, [updateArrows])

	const scrollByDirection = (direction: 1 | -1) => {
		const el = scrollerRef.current
		if (!el) return
		el.scrollBy({
			left: direction * Math.max(180, el.clientWidth * 0.7),
			behavior: prefersReducedMotion() ? 'auto' : 'smooth',
		})
	}

	const handleJump = (
		event: ReactMouseEvent<HTMLAnchorElement>,
		id: string,
	) => {
		event.preventDefault()
		const target = document.getElementById(id)
		if (!target) return
		target.scrollIntoView({
			behavior: prefersReducedMotion() ? 'auto' : 'smooth',
			block: 'start',
		})
		if (typeof history !== 'undefined' && history.replaceState) {
			history.replaceState(null, '', `#${id}`)
		}
	}

	const arrowClass =
		'grid h-7 w-7 shrink-0 place-items-center rounded-full border border-slate-300/70 bg-white/80 text-slate-600 shadow-sm transition duration-200 ease-out hover:bg-white hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 focus-visible:outline disabled:pointer-events-none disabled:opacity-50 motion-safe:hover:-translate-y-0.5'

	return (
		<nav
			aria-label="Indice delle sezioni"
			className="relative mt-5 border-t border-slate-900/10 pt-4"
		>
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={() => scrollByDirection(-1)}
					disabled={!canScrollLeft}
					aria-label="Scorri le sezioni indietro"
					className={arrowClass}
				>
					<ChevronLeft className="h-4 w-4" aria-hidden />
				</button>

				<ul
					ref={scrollerRef}
					onScroll={updateArrows}
					className="flex flex-1 snap-x gap-1.5 overflow-x-auto pt-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				>
					{items.map((item) => {
						const Icon = item.icon
						return (
							<li key={item.id} className="snap-start">
								<a
									href={`#${item.id}`}
									onClick={(event) => handleJump(event, item.id)}
									className="group inline-flex items-center gap-1.5 rounded-full border border-slate-300/70 bg-white/70 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-slate-700 shadow-sm transition duration-200 ease-out hover:border-slate-400 hover:bg-white hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 focus-visible:outline motion-safe:hover:-translate-y-0.5"
								>
									<Icon
										className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-colors duration-200 group-hover:text-slate-700"
										aria-hidden
									/>
									{item.label}
								</a>
							</li>
						)
					})}
				</ul>

				<button
					type="button"
					onClick={() => scrollByDirection(1)}
					disabled={!canScrollRight}
					aria-label="Scorri le sezioni avanti"
					className={arrowClass}
				>
					<ChevronRight className="h-4 w-4" aria-hidden />
				</button>
			</div>
		</nav>
	)
}

export default function PlaygroundShowcasePage() {
	const { playground, satispayPaymentUrl, showNews } =
		useLoaderData<typeof loader>()
	const newsYear = playground?.year ?? new Date().getFullYear()

	/** Voci del table of contents: "Novità" appare solo finché è visibile. */
	const tocItems: TocItem[] = [
		...(showNews ? [{ id: 'novita', label: 'Novità', icon: Sparkles }] : []),
		{ id: 'organizzazione', label: 'Organizzazione', icon: ShieldCheck },
		{ id: 'premi', label: 'Premi', icon: Award },
		{ id: 'foto', label: 'Foto', icon: Images },
		{ id: 'cibo', label: 'Cibo', icon: HandPlatter },
		{ id: 'baskin', label: 'Baskin', icon: HeartHandshake },
		{ id: 'sponsor', label: 'Sponsor', icon: Star },
		{ id: 'info', label: 'Info utili', icon: Info },
		{ id: 'mappa', label: 'Mappa', icon: MapPin },
	]

	return (
		<>
			<style>{`
        body::before {
          background-image: url('/logo_longara_bw.jpg');
        }
      `}</style>
			<main className="relative overflow-hidden px-4 py-4 md:min-h-screen md:items-center md:justify-center md:py-12">
				<div
					aria-hidden="true"
					className="menu-hero-grain pointer-events-none absolute inset-0 opacity-20"
				/>

				<div className="relative mx-auto flex w-full max-w-lg flex-col gap-4 md:gap-8">
					<header className={cn('menu-hero-card', 'menu-hero-card-v1')}>
						<div
							aria-hidden="true"
							className="menu-hero-overlay-v1 pointer-events-none absolute inset-0"
						/>
						<div
							aria-hidden="true"
							className="menu-hero-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
						/>
						<div
							className="pointer-events-none absolute top-3 right-3 z-10 sm:top-4 sm:right-4"
							aria-hidden="true"
						>
							<div className="rounded-full bg-white/80 p-0.5 shadow-lg ring-2 shadow-slate-900/15 ring-white/90 ring-offset-1 ring-offset-white/50 motion-safe:rotate-6">
								<img
									src="/logo_longara.JPG"
									alt=""
									className="h-10 w-10 rounded-full object-cover sm:h-14 sm:w-14"
									width={56}
									height={56}
									loading="eager"
								/>
							</div>
						</div>
						<div className="relative sm:pr-16">
							<p className="text-sm font-medium tracking-wide text-slate-700/95">
								Pagina ufficiale
							</p>
							<h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
								7° Torneo di Basket Longara
							</h1>
							<p className="mt-2 text-sm leading-relaxed text-slate-800/95">
								La pagina bacheca con tutte le info rapide: organizzazione,
								sponsor, cibo e aggiornamenti dell&apos;evento.
							</p>

							{playground ? (
								<div className="mt-4 flex flex-col gap-2 sm:flex-row">
									<div className="space-y-2">
										<Link
											className="nav-button group justify-center"
											to={`/playground/${playground.id}/menu`}
										>
											<Trophy className="h-4.5 w-4.5 shrink-0" aria-hidden />
											<span className="nav-button-animate-text">
												Apri il torneo
											</span>
											<ArrowRight
												className="h-4 w-4 shrink-0 transition-transform duration-200 ease-out motion-safe:group-hover:translate-x-0.5"
												aria-hidden
											/>
										</Link>
										<p className="text-center text-xs font-medium text-slate-600">
											Calendario, partite, punteggi e classifiche
										</p>
									</div>
								</div>
							) : (
								<p className="mt-4 rounded-xl border border-amber-300 bg-amber-100/90 px-4 py-3 text-sm text-amber-950">
									Torneo non ancora configurato: il menu ufficiale sarà
									disponibile a breve.
								</p>
							)}
						</div>

						{tocItems.length > 1 ? (
							<ShowcaseTableOfContents items={tocItems} />
						) : null}
					</header>

					{showNews ? (
						<section
							id="novita"
							className={cn(
								'section-blur',
								'highlights-card-v1',
								'scroll-mt-4',
							)}
						>
							<div
								aria-hidden="true"
								className="menu-hero-overlay-v1 pointer-events-none absolute inset-0"
							/>
							<div
								aria-hidden="true"
								className="menu-hero-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
							/>
							<div className="relative space-y-4">
								<h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
									<Sparkles className="h-5 w-5" aria-hidden />
									Novità {newsYear}
								</h2>

								<div className="rounded-lg border border-emerald-300/70 bg-emerald-50/90 p-3">
									<h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
										<Wallet className="h-4 w-4 shrink-0" aria-hidden />
										Vuoi partecipare al torneo?
									</h3>
									<p className="mt-2 text-sm leading-relaxed text-emerald-950/95">
										Da quest'anno è possibile saldare l&apos;iscrizione tramite
										Satispay.
										<br />
										<br />
										Il costo è di <strong>15&nbsp;€</strong> per persona (minimo
										3 giocatori per squadra).
										<br />
										<br />
										<span className="font-semibold">
											❗️ Dopo aver pagato:
										</span>{' '}
										scrivici su instagram e comunicaci di aver completato
										l'iscrizione tramite satispay, fornendoci i nomi dei
										giocatori, le taglie della divisa e il nome della squadra.
									</p>
									{satispayPaymentUrl ? (
										<div className="mt-4 flex flex-col items-stretch gap-2 sm:items-start">
											<span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-700/30 bg-white/85 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-emerald-900 uppercase shadow-sm">
												Iscriviti subito
												<ArrowDown
													aria-hidden="true"
													className="cta-arrow mb-1 h-3.5 w-3.5"
												/>
											</span>
											<a
												href={satispayPaymentUrl}
												target="_blank"
												rel="noreferrer"
												className="cta-satispay group relative inline-flex items-center justify-center overflow-hidden rounded-xl border border-emerald-600 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 transition duration-200 ease-out hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-900/25 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline motion-safe:hover:-translate-y-0.5"
											>
												<span
													aria-hidden="true"
													className="cta-shine pointer-events-none absolute inset-y-0 -left-1/3 block w-1/3 bg-linear-to-r from-transparent via-white/55 to-transparent"
												/>
												<span className="relative">Paga con Satispay!</span>
											</a>
										</div>
									) : (
										<p className="mt-2 text-sm text-emerald-900/85 italic">
											Link per il pagamento sarà pubblicato qui appena
											disponibile; intanto segui le comunicazioni
											dell&apos;organizzazione.
										</p>
									)}
								</div>

								{/* <ul className="space-y-2">
								{newsItems.map((item) => (
									<li
										key={item.title}
										className="rounded-lg border border-slate-300/70 bg-white/75 p-3"
									>
										<p className="text-sm font-semibold text-slate-900">
											{item.title}
										</p>
										<p className="mt-1 text-sm text-slate-800">
											{item.description}
										</p>
										{item.badge ? (
											<p className="mt-2 inline-block rounded-full border border-violet-300/80 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-900">
												{item.badge}
											</p>
										) : null}
									</li>
								))}
							</ul> */}
							</div>
						</section>
					) : null}

					<Accordion
						type="multiple"
						defaultValue={[...showcaseAccordionSections]}
						className="flex flex-col gap-4 md:gap-8"
					>
						<ShowcaseAccordionSection
							value="organization"
							id="organizzazione"
							icon={ShieldCheck}
							title="Organizzazione torneo"
						>
							<div className="space-y-3">
								<div className="rounded-xl border border-white/70 bg-white/80 p-3.5 shadow-sm ring-1 ring-slate-200/60">
									<div className="flex items-center gap-2.5">
										<span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300/70">
											<Swords className="h-4.5 w-4.5" aria-hidden />
										</span>
										<div className="min-w-0">
											<p className="text-sm font-bold text-slate-900">
												Formato evento
											</p>
											<p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
												Torneo 3 vs 3
											</p>
										</div>
									</div>
									<div className="mt-3 grid grid-cols-2 gap-2">
										<div className="rounded-lg bg-slate-900/5 px-3 py-2 text-center ring-1 ring-slate-200/70">
											<p className="text-2xl font-black tracking-tight text-slate-900 tabular-nums">
												{tournamentFormat.points}
											</p>
											<p className="mt-0.5 text-[11px] font-semibold text-slate-600">
												punti per vincere
											</p>
										</div>
										<div className="rounded-lg bg-slate-900/5 px-3 py-2 text-center ring-1 ring-slate-200/70">
											<p className="text-2xl font-black tracking-tight text-slate-900 tabular-nums">
												{tournamentFormat.minutes}
												<span className="text-base">′</span>
											</p>
											<p className="mt-0.5 text-[11px] font-semibold text-slate-600">
												o chi è in testa
											</p>
										</div>
									</div>
									<p className="mt-2.5 text-xs leading-relaxed text-slate-600">
										Vince chi arriva a {tournamentFormat.points} punti, oppure
										chi è in vantaggio allo scadere dei{' '}
										{tournamentFormat.minutes} minuti.
									</p>
								</div>

								<div className="rounded-xl border border-white/70 bg-white/80 p-3.5 shadow-sm ring-1 ring-slate-200/60">
									<div className="flex items-center gap-2.5">
										<span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 ring-1 ring-sky-300/70">
											<CalendarDays className="h-4.5 w-4.5" aria-hidden />
										</span>
										<p className="text-sm font-bold text-slate-900">
											Come si svolge
										</p>
									</div>
									<ol className="mt-3 space-y-1">
										{tournamentPhases.map((phase, index) => {
											const Icon = phase.icon
											const isLast = index === tournamentPhases.length - 1
											return (
												<li key={phase.label} className="flex gap-3">
													<div className="flex flex-col items-center">
														<span
															className={cn(
																'grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1',
																accentBadgeStyles[phase.accent],
															)}
														>
															<Icon className="h-4.5 w-4.5" aria-hidden />
														</span>
														{!isLast ? (
															<span
																aria-hidden="true"
																className="my-1 w-px flex-1 bg-slate-300/70"
															/>
														) : null}
													</div>
													<div className={cn('min-w-0', isLast ? '' : 'pb-1')}>
														<p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
															{phase.days}
														</p>
														<p className="text-sm font-bold text-slate-900">
															{phase.label}
														</p>
													</div>
												</li>
											)
										})}
									</ol>
								</div>
							</div>
						</ShowcaseAccordionSection>

						<ShowcaseAccordionSection
							value="prizes"
							id="premi"
							icon={Award}
							title="Premi"
							description="Record e obiettivi premiati durante il torneo."
						>
							<div className="space-y-3">
								<div className="group relative overflow-hidden rounded-2xl border border-amber-300/70 bg-linear-to-br from-amber-50 via-yellow-50 to-amber-100/80 p-4 shadow-md ring-1 shadow-amber-900/10 ring-amber-200/60 transition-transform duration-200 motion-safe:hover:-translate-y-0.5">
									<div
										aria-hidden="true"
										className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-amber-300/30 blur-2xl"
									/>
									<span className="relative inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-100/90 px-2.5 py-0.5 text-[11px] font-bold tracking-[0.14em] text-amber-800 uppercase">
										<Sparkles className="h-3 w-3" aria-hidden />
										Premio principale
									</span>
									<div className="relative mt-3 flex items-center gap-3.5">
										<div className="relative shrink-0">
											<div className="prize-trophy grid h-13 w-13 place-items-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-lg ring-2 shadow-amber-900/25 ring-white/70">
												<Trophy className="h-7 w-7" aria-hidden />
											</div>
										</div>
										<div className="min-w-0">
											<p className="text-base leading-tight font-extrabold tracking-tight text-amber-950">
												{featuredPrize.title}
											</p>
											<p className="mt-0.5 text-sm font-medium text-amber-900/90">
												{featuredPrize.description}
											</p>
											{featuredPrize.sponsor ? (
												<p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-300/60">
													<HandPlatter className="h-3 w-3" aria-hidden />
													{featuredPrize.sponsor}
												</p>
											) : null}
										</div>
									</div>
								</div>

								<ul className="grid gap-2 sm:grid-cols-2">
									{prizes.map((prize) => {
										const Icon = prize.icon
										return (
											<li
												key={prize.title}
												className="group flex items-start gap-3 rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm ring-1 ring-slate-200/60 transition-transform duration-200 motion-safe:hover:-translate-y-0.5"
											>
												<span
													className={cn(
														'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 transition-transform duration-200 motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-6',
														accentBadgeStyles[prize.accent],
													)}
												>
													<Icon className="h-4.5 w-4.5" aria-hidden />
												</span>
												<div className="min-w-0">
													<p className="text-sm leading-tight font-bold text-slate-900">
														{prize.title}
													</p>
													<p className="mt-0.5 text-sm text-slate-700">
														{prize.description}
													</p>
													{prize.sponsor ? (
														<p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-300/60">
															<HandPlatter className="h-3 w-3" aria-hidden />
															{prize.sponsor}
														</p>
													) : null}
												</div>
											</li>
										)
									})}
								</ul>
							</div>
						</ShowcaseAccordionSection>

						<ShowcaseAccordionSection
							value="photos"
							id="foto"
							icon={Images}
							title="Foto del torneo"
							description="Rivivi i momenti migliori: l'album condiviso del torneo."
						>
							<a
								href={tournamentPhotosUrl}
								target="_blank"
								rel="noreferrer"
								className="group relative block overflow-hidden rounded-2xl border border-fuchsia-300/70 bg-linear-to-br from-fuchsia-50 via-rose-50 to-violet-100/80 p-4 shadow-md ring-1 shadow-fuchsia-900/10 ring-fuchsia-200/60 transition duration-200 ease-out hover:shadow-lg hover:shadow-fuchsia-900/15 focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 focus-visible:outline motion-safe:hover:-translate-y-0.5"
							>
								<div
									aria-hidden="true"
									className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-fuchsia-300/30 blur-2xl"
								/>
								<div className="relative flex items-center gap-3.5">
									<div className="relative shrink-0">
										{/* Stack di "polaroid" per richiamare l'idea di un album */}
										<div
											aria-hidden="true"
											className="absolute -top-1.5 -left-1.5 h-12 w-12 rounded-xl bg-white/80 shadow-sm ring-1 ring-fuchsia-200/70 transition-transform duration-200 motion-safe:group-hover:-rotate-6"
										/>
										<div
											aria-hidden="true"
											className="absolute -top-0.5 left-1 h-12 w-12 rounded-xl bg-white/90 shadow-sm ring-1 ring-rose-200/70 transition-transform duration-200 motion-safe:group-hover:rotate-3"
										/>
										<div className="relative grid h-13 w-13 place-items-center rounded-2xl bg-linear-to-br from-fuchsia-500 to-violet-600 text-white shadow-lg ring-2 shadow-fuchsia-900/25 ring-white/70 transition-transform duration-200 motion-safe:group-hover:scale-105">
											<Camera className="h-6.5 w-6.5" aria-hidden />
										</div>
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-base leading-tight font-extrabold tracking-tight text-fuchsia-950">
											Apri l&apos;album del torneo
										</p>
										<p className="mt-0.5 text-sm font-medium text-fuchsia-900/90">
											Tutte le foto raccolte su Google Drive.
										</p>
									</div>
									<span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/80 text-fuchsia-700 shadow-sm ring-1 ring-fuchsia-300/70 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5">
										<ImageDown className="h-4.5 w-4.5" aria-hidden />
									</span>
								</div>
							</a>
						</ShowcaseAccordionSection>

						<ShowcaseAccordionSection
							value="food"
							id="cibo"
							icon={HandPlatter}
							title="Cibo e bevande"
						>
							<div className="space-y-3">
								<p className="flex items-center gap-2 text-sm font-medium text-slate-700">
									<Clock
										className="h-4 w-4 shrink-0 text-slate-500"
										aria-hidden
									/>
									Cucina aperta ogni giorno dalle 18:00 alle 22:00.
								</p>

								<div className="relative overflow-hidden rounded-2xl border border-sky-300/70 bg-linear-to-br from-sky-50 via-cyan-50 to-blue-100/70 p-3.5 shadow-sm ring-1 ring-sky-200/60">
									<div
										aria-hidden="true"
										className="pointer-events-none absolute -top-8 -right-6 h-24 w-24 rounded-full bg-sky-300/30 blur-2xl"
									/>
									<div className="relative">
										<p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-sky-800 uppercase">
											<GlassWater className="h-3.5 w-3.5" aria-hidden />
											Bevande · tutti i giorni
										</p>
										<div className="mt-2 flex flex-wrap gap-1.5">
											{drinks.map((drink) => {
												const Icon = drink.icon
												return (
													<span
														key={drink.label}
														className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/60 bg-white/80 px-2.5 py-1 text-xs font-semibold text-sky-900 shadow-sm"
													>
														<Icon
															className="h-3.5 w-3.5 text-sky-600"
															aria-hidden
														/>
														{drink.label}
													</span>
												)
											})}
										</div>
										<p className="mt-2 text-xs font-medium text-sky-900/80">
											Acqua, bibite e birra <strong>a volontà</strong>.
										</p>
									</div>
								</div>

								<ol className="space-y-2">
									{foodSchedule.map((entry) => (
										<li
											key={`${entry.day}-${entry.month}`}
											className={cn(
												'flex items-stretch gap-3 rounded-xl border p-2.5 transition-transform duration-200',
												entry.paused
													? 'border-slate-300/60 bg-slate-100/70'
													: entry.opening
														? 'border-amber-300/70 bg-linear-to-br from-amber-50 to-yellow-50/80 shadow-sm ring-1 ring-amber-200/60 motion-safe:hover:-translate-y-0.5'
														: 'border-white/70 bg-white/75 shadow-sm ring-1 ring-slate-200/50 motion-safe:hover:-translate-y-0.5',
											)}
										>
											<div
												className={cn(
													'grid w-14 shrink-0 place-items-center rounded-lg px-1 py-1.5 text-center leading-none',
													entry.paused
														? 'bg-slate-200 text-slate-500'
														: entry.opening
															? 'bg-amber-500 text-white shadow-sm shadow-amber-900/20'
															: 'bg-slate-900 text-white',
												)}
											>
												<span className="text-xl font-black tracking-tight">
													{entry.day}
												</span>
												<span className="mt-0.5 text-[10px] font-bold tracking-[0.12em]">
													{entry.month}
												</span>
											</div>

											<div className="flex min-w-0 flex-1 flex-col justify-center">
												<div className="flex items-center gap-1.5">
													<p
														className={cn(
															'text-sm font-bold',
															entry.paused
																? 'text-slate-500'
																: 'text-slate-900',
														)}
													>
														{entry.weekday}
													</p>
													{entry.opening ? (
														<span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-800 uppercase">
															<PartyPopper className="h-3 w-3" aria-hidden />
															Si parte!
														</span>
													) : null}
												</div>

												{entry.paused ? (
													<p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
														<Moon
															className="h-3.5 w-3.5 shrink-0"
															aria-hidden
														/>
														Torneo in pausa — niente cucina oggi
													</p>
												) : entry.items && entry.items.length > 0 ? (
													<div className="mt-1.5 flex flex-wrap gap-1.5">
														{entry.items.map((item) => (
															<span
																key={item}
																className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-amber-900 shadow-sm"
															>
																<UtensilsCrossed
																	className="h-3 w-3 text-amber-600"
																	aria-hidden
																/>
																{item}
															</span>
														))}
													</div>
												) : (
													<p className="mt-0.5 text-xs font-medium text-slate-500 italic">
														Menu in arrivo — lo sveleremo a breve
													</p>
												)}
											</div>
										</li>
									))}
								</ol>
							</div>
						</ShowcaseAccordionSection>
					</Accordion>

					<div id="baskin" className="relative scroll-mt-4 space-y-4">
						<div className="relative overflow-hidden rounded-2xl border border-orange-400/35 bg-linear-to-br from-[#0c1a33] via-[#122a4a] to-[#0a1428] text-white shadow-lg ring-1 shadow-slate-900/25 ring-white/10">
							<h2 className="font-semiboldtext-white flex items-center gap-2 p-5 text-lg">
								<HeartHandshake className="h-5 w-5 shrink-0" aria-hidden />
								Baskin — West River Calderara ASD
							</h2>
							<div
								aria-hidden="true"
								className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl"
							/>
							<div
								aria-hidden="true"
								className="pointer-events-none absolute -bottom-8 -left-12 h-48 w-48 rounded-full bg-sky-400/10 blur-2xl"
							/>
							<svg
								className="pointer-events-none absolute right-0 bottom-0 left-0 h-24 w-full text-orange-400/20"
								viewBox="0 0 400 80"
								preserveAspectRatio="none"
								aria-hidden
							>
								<path
									fill="none"
									stroke="currentColor"
									strokeWidth="3"
									d="M-20 55 C 60 20, 120 75, 200 40 S 340 10, 420 50"
								/>
							</svg>

							<div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6">
								<div className="mx-auto shrink-0 sm:mx-0">
									<div className="relative">
										<div
											aria-hidden="true"
											className="absolute -inset-1 rounded-full bg-linear-to-br from-orange-400 to-orange-600 opacity-90 shadow-md shadow-orange-900/40"
										/>
										<img
											src="/WR_LOGO_PNG.png"
											alt="Logo West River Calderara ASD"
											width={120}
											height={120}
											className="relative h-30 w-30 rounded-full border-4 border-[#0c1a33] bg-[#0c1a33] object-contain p-1.5"
											loading="lazy"
											decoding="async"
										/>
									</div>
								</div>

								<div className="min-w-0 flex-1 space-y-3">
									<div className="flex flex-wrap items-center gap-2">
										<span className="inline-flex items-center rounded-full border border-orange-400/50 bg-orange-500/20 px-2.5 py-0.5 text-[11px] font-bold tracking-[0.12em] text-orange-100 uppercase">
											Basket inclusivo
										</span>
										<span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/90">
											<CalendarClock
												className="h-3.5 w-3.5 text-orange-200"
												aria-hidden
											/>
											Venerdì 3 luglio 2026 dalle 19
										</span>
									</div>

									<p className="text-base leading-snug font-bold tracking-tight text-white sm:text-lg">
										Conosci West River: sport, squadra e tanto altro!
									</p>
									<p className="text-sm leading-relaxed text-slate-200/95">
										Il <strong className="text-white">baskin</strong> è basket
										accessibile a tutti: ritmo, gioco di squadra e tanto
										entusiasmo. Al torneo dedichiamo un momento speciale
										chiamato <strong className="text-white">Basket2All</strong>,
										fermati e impara a conoscere questo sport.
									</p>
									<p className="flex gap-2 rounded-xl border border-white/15 bg-white/5 p-3 text-sm leading-relaxed text-slate-100/95">
										<Bus
											className="mt-0.5 h-5 w-5 shrink-0 text-orange-300"
											aria-hidden
										/>
										<span>
											<strong className="text-white">
												Obiettivo: un pulmino per la società.
											</strong>{' '}
											Un mezzo per accompagnare giocatori, squadre e famiglie a
											gare, eventi ed allenamenti: se puoi, sostieni la raccolta
											con una donazione.
										</span>
									</p>
								</div>
							</div>

							<div className="relative border-t border-white/10 bg-black/20 px-5 py-4 sm:px-6">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<p className="text-xs leading-relaxed text-slate-300/95 sm:max-w-[55%]">
										Ogni contributo, anche piccolo, si somma: grazie per
										aiutarci a portare avanti questa realtà.
									</p>
									<div className="flex w-full flex-col items-stretch gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
										{westRiverShowcaseLinks.donationUrl ? (
											<a
												href={westRiverShowcaseLinks.donationUrl}
												target="_blank"
												rel="noreferrer"
												className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl border border-orange-500 bg-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-orange-950/30 transition duration-200 ease-out hover:border-orange-400 hover:bg-orange-400 hover:shadow-lg hover:shadow-orange-950/35 focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1a33] focus-visible:outline motion-safe:hover:-translate-y-0.5"
											>
												<span
													aria-hidden="true"
													className="pointer-events-none absolute inset-y-0 -left-1/3 block w-1/3 bg-linear-to-r from-transparent via-white/45 to-transparent transition-transform duration-500 group-hover:translate-x-[220%]"
												/>
												<Heart
													className="relative h-4 w-4 shrink-0"
													aria-hidden
												/>
												<span className="relative">Dona per il pulmino</span>
											</a>
										) : (
											<p className="rounded-lg border border-orange-400/25 bg-orange-500/10 px-3 py-2 text-center text-xs font-medium text-orange-100/95 sm:text-left">
												Il link per la donazione sarà pubblicato qui a breve.
											</p>
										)}
										<div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
											<a
												href={westRiverShowcaseLinks.websiteUrl}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1a33] focus-visible:outline"
											>
												<Globe className="h-4 w-4 shrink-0" aria-hidden />
												Sito ufficiale
											</a>
											<a
												href={westRiverShowcaseLinks.instagramUrl}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1a33] focus-visible:outline"
											>
												<InstagramIcon
													size={16}
													className="shrink-0"
													aria-hidden
												/>
												Instagram
											</a>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<Accordion
						type="multiple"
						defaultValue={['sponsors', 'info', 'map']}
						className="flex flex-col gap-4 md:gap-8"
					>
						<ShowcaseAccordionSection
							value="sponsors"
							id="sponsor"
							icon={Star}
							title="Sponsor"
							description="Un grazie speciale ai partner che supportano il torneo."
						>
							<ul className="grid grid-cols-2 gap-2.5">
								{sponsors.map((sponsor) => (
									<li
										key={sponsor.name}
										className="group flex items-center justify-center rounded-xl border border-white/70 bg-white/85 px-3 py-5 shadow-sm ring-1 ring-slate-200/60 transition-transform duration-200 motion-safe:hover:-translate-y-0.5"
									>
										<img
											src={`/${sponsor.logo}`}
											alt={sponsor.name}
											className="h-16 w-auto max-w-full object-contain transition-transform duration-200 motion-safe:group-hover:scale-105"
											loading="lazy"
											decoding="async"
										/>
									</li>
								))}
							</ul>
							<p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600">
								<Heart className="h-3.5 w-3.5 text-rose-500" aria-hidden />
								Grazie per rendere possibile il torneo
							</p>
						</ShowcaseAccordionSection>

						<ShowcaseAccordionSection
							value="info"
							id="info"
							icon={Info}
							title="Info utili"
						>
							<ul className="space-y-2">
								{latestInfo.map((info) => {
									const Icon = info.icon
									return (
										<li
											key={info.title}
											className="group flex items-start gap-3 rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm ring-1 ring-slate-200/60 transition-transform duration-200 motion-safe:hover:-translate-y-0.5"
										>
											<span
												className={cn(
													'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 transition-transform duration-200 motion-safe:group-hover:scale-110',
													accentBadgeStyles[info.accent],
												)}
											>
												<Icon className="h-4.5 w-4.5" aria-hidden />
											</span>
											<div className="min-w-0">
												<p className="text-sm font-bold text-slate-900">
													{info.title}
												</p>
												<p className="mt-0.5 text-sm leading-relaxed text-slate-700">
													{info.description}
												</p>
											</div>
										</li>
									)
								})}
							</ul>
						</ShowcaseAccordionSection>

						<ShowcaseAccordionSection
							value="map"
							id="mappa"
							icon={MapPin}
							title="Mappa del torneo"
							description="Noi siamo qui! Apri Google Maps per le indicazioni stradali."
						>
							<EventVenueMap />
						</ShowcaseAccordionSection>
					</Accordion>

					<section className="section-blur">
						<div className="space-y-3 text-sm text-slate-900">
							<p className="flex items-center gap-2">
								<CalendarClock className="h-4 w-4" />
								Aggiornamenti e programma pubblicati ogni giorno.
							</p>
							<p className="flex items-center gap-2">
								<Trophy className="h-4 w-4" />
								Per calendario, partite e classifiche usa il menu torneo.
							</p>
						</div>
						<nav className="mt-4 flex items-center justify-center gap-2">
							<ul className="grid grid-flow-col gap-2">
								<li>
									<Link
										aria-label="Apri Facebook del torneo"
										className="group inline-flex rounded-full p-1 transition-colors duration-200 hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
										to="https://www.facebook.com/Torneo3vs3Longara"
										target="_blank"
										rel="noreferrer"
									>
										<span className="transition-transform duration-200 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:scale-110">
											<FacebookIcon />
										</span>
									</Link>
								</li>
								<li>
									<Link
										aria-label="Apri Instagram del torneo"
										className="group inline-flex rounded-full p-1 transition-colors duration-200 hover:bg-pink-100 focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:outline-none"
										to="https://www.instagram.com/torneodilongara/"
										target="_blank"
										rel="noreferrer"
									>
										<span className="transition-transform duration-200 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:scale-110">
											<InstagramIcon />
										</span>
									</Link>
								</li>
							</ul>
						</nav>
					</section>
				</div>
			</main>
		</>
	)
}

/** Album foto del torneo su Google Drive (solo reindirizzamento esterno). */
const tournamentPhotosUrl =
	'https://drive.google.com/drive/folders/1x3dOm0464uCPrEsF0UR4LS5JZl1jJQca'

/** Link West River nella card showcase */
const westRiverShowcaseLinks = {
	donationUrl: 'https://ideaginger.it/sostieni-3737.html',
	websiteUrl: 'https://westriver.altervista.org/',
	instagramUrl: 'https://www.instagram.com/westriver_asd/',
}

// const newsItems = [
// 	{
// 		title: 'Regole speciali in arrivo',
// 		description:
// 			'Quest’anno introdurremo regole speciali per rendere le partite ancora più avvincenti ed emozionanti. I dettagli verranno comunicati passo passo.',
// 		badge: 'Seguiranno aggiornamenti',
// 	},
// ] as const

/** Regole sintetiche del formato di gioco, mostrate come stat. */
const tournamentFormat = {
	points: 31,
	minutes: 15,
}

type TournamentPhase = {
	days: string
	label: string
	icon: LucideIcon
	accent: AccentColor
}

/** Fasi del torneo nell'ordine cronologico. */
const tournamentPhases: TournamentPhase[] = [
	{
		days: '1ª Domenica → Mercoledì',
		label: 'Gironi',
		icon: Users,
		accent: 'sky',
	},
	{ days: 'Giovedì', label: 'Play-in', icon: Flame, accent: 'rose' },
	{
		days: '2ª Domenica',
		label: 'Play-off e finali',
		icon: Trophy,
		accent: 'amber',
	},
]

/** Classi statiche per i badge-icona (evita class dinamiche non purgate da Tailwind). */
const accentBadgeStyles = {
	amber: 'bg-amber-100 text-amber-700 ring-amber-300/70',
	violet: 'bg-violet-100 text-violet-700 ring-violet-300/70',
	slate: 'bg-slate-200 text-slate-700 ring-slate-300/80',
	rose: 'bg-rose-100 text-rose-700 ring-rose-300/70',
	indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-300/70',
	emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-300/70',
	sky: 'bg-sky-100 text-sky-700 ring-sky-300/70',
} as const

type AccentColor = keyof typeof accentBadgeStyles

type Prize = {
	title: string
	description: string
	icon: LucideIcon
	accent: AccentColor
	sponsor?: string
	featured?: boolean
}

/** Premio in evidenza: la squadra vincitrice del torneo. */
const featuredPrize: Prize = {
	title: 'Squadra 1ª classificata',
	description: 'Cena di squadra',
	icon: Trophy,
	accent: 'amber',
	sponsor: 'Trattoria da Gianna',
	featured: true,
}

const prizes: Prize[] = [
	{
		title: 'Squadre 2ª e 3ª classificate',
		description: 'Ricche ceste di prodotti alimentari',
		icon: Medal,
		accent: 'slate',
	},
	{
		title: 'Squadre 1ª di ogni girone',
		description: 'Cena offerta allo stand del torneo',
		icon: Flag,
		accent: 'sky',
	},
	{
		title: 'MVP playoff + finali',
		description: 'Aperitivo completo per 2 persone',
		icon: Crown,
		accent: 'indigo',
		sponsor: 'Bardamù',
	},
	{
		title: 'Damuuuv — miglior giocata',
		description: 'Premiata ogni sera',
		icon: Zap,
		accent: 'violet',
		sponsor: 'Bardamù',
	},
	{
		title: 'Miglior marcatore gironi',
		description: 'Pallone da basket',
		icon: Target,
		accent: 'rose',
	},
	{
		title: 'Vincitore 3PT Challenge',
		description: 'Zainetto in palio',
		icon: Crosshair,
		accent: 'emerald',
	},
]

const drinks = [
	{ label: 'Acqua', icon: GlassWater },
	{ label: 'Bibite', icon: CupSoda },
	{ label: 'Birra', icon: Beer },
] as const

type FoodDay = {
	weekday: string
	day: string
	month: string
	items?: string[]
	paused?: boolean
	opening?: boolean
}

/** Menu giorno per giorno del torneo (28 giu → 5 lug, pausa sabato 4). */
const foodSchedule: FoodDay[] = [
	{
		weekday: 'Domenica',
		day: '28',
		month: 'GIU',
		items: ['Patatine', 'Piadine', 'Crescentine'],
		opening: true,
	},
	{
		weekday: 'Lunedì',
		day: '29',
		month: 'GIU',
		items: ['Patatine', 'Piadine', 'Pizze'],
	},
	{ weekday: 'Martedì', day: '30', month: 'GIU' },
	{ weekday: 'Mercoledì', day: '1', month: 'LUG' },
	{ weekday: 'Giovedì', day: '2', month: 'LUG' },
	{ weekday: 'Venerdì', day: '3', month: 'LUG' },
	{ weekday: 'Sabato', day: '4', month: 'LUG', paused: true },
	{ weekday: 'Domenica', day: '5', month: 'LUG' },
]

const sponsors = [
	{ name: 'Punto3', logo: 'logo_punto3.png' },
	{ name: 'Trattoria da Gianna', logo: 'logo_gianna.png' },
	{ name: 'Bardamù', logo: 'logo_bardamu.png' },
	{ name: 'Ristorante Laghetto Longara', logo: 'logo_laghetto.jpg' },
]

type InfoItem = {
	title: string
	description: string
	icon: LucideIcon
	accent: AccentColor
}

const latestInfo: InfoItem[] = [
	{
		title: 'Check-in squadre',
		description:
			'Presentarsi almeno 20 minuti prima della prima partita per: registrazione giocatori, consegna divisa, pagamento e firma della liberatoria.',
		icon: ClipboardCheck,
		accent: 'emerald',
	},
	{
		title: 'Comunicazioni live',
		description:
			'Seguici su Instagram e Facebook per variazioni orari, meteo e avvisi rapidi.',
		icon: Megaphone,
		accent: 'violet',
	},
]
