import { PrismaClient } from '@prisma/client'
import { type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { FacebookIcon } from 'icons/lucide-facebook'
import { InstagramIcon } from 'icons/lucide-instagram'
import {
	ArrowDown,
	Bus,
	CalendarClock,
	Globe,
	HandPlatter,
	Heart,
	HeartHandshake,
	Info,
	MapPin,
	ShieldCheck,
	Sparkles,
	Star,
	Trophy,
	Wallet,
} from 'lucide-react'
import { EventVenueMap } from '~/components/EventVenueMap'
import { cn } from '~/lib/utils'

const prisma = new PrismaClient()

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

	return { playground, satispayPaymentUrl }
}

export default function PlaygroundShowcasePage() {
	const { playground, satispayPaymentUrl } = useLoaderData<typeof loader>()
	const newsYear = playground?.year ?? new Date().getFullYear()

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
						<div className="relative">
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
									<Link
										className="nav-button group justify-center"
										to={`/playground/${playground.id}/menu`}
									>
										<span className="nav-button-animate-text">
											Apri il menu torneo
										</span>
									</Link>
								</div>
							) : (
								<p className="mt-4 rounded-xl border border-amber-300 bg-amber-100/90 px-4 py-3 text-sm text-amber-950">
									Torneo non ancora configurato: il menu ufficiale sarà
									disponibile a breve.
								</p>
							)}
						</div>
					</header>

					<section className={cn('section-blur', 'highlights-card-v1')}>
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
									Satispay. Chi paga entro fine maggio 2026 e iscrive almeno tre
									giocatori per squadra ha uno sconto di 5&nbsp;€: quota{' '}
									<span className="font-semibold">10&nbsp;€</span> a testa
									invece di{' '}
									<span className="line-through opacity-80">15&nbsp;€</span>.
									<br />
									<br />
									<span className="font-semibold">
										⭐️ Iscriversi subito conviene:
									</span>{' '}
									ti garantiremo la scelta della taglia della divisa!
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

							<ul className="space-y-2">
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
							</ul>
						</div>
					</section>

					<section className={cn('section-blur', 'highlights-card-v1')}>
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
								<ShieldCheck className="h-5 w-5" />
								Organizzazione torneo
							</h2>
							<ul className="space-y-2">
								{organizationInfo.map((item) => (
									<li
										key={item.label}
										className="rounded-lg border border-slate-300/70 bg-white/70 p-3"
									>
										<p className="text-sm font-semibold text-slate-900">
											{item.label}
										</p>
										<p className="mt-1 text-sm text-slate-800">{item.value}</p>
									</li>
								))}
							</ul>
						</div>
					</section>

					<section className={cn('section-blur', 'highlights-card-v1')}>
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
								<HandPlatter className="h-5 w-5" />
								Cibo e bevande
							</h2>
							<p className="mt-1 rounded-lg border border-slate-300/70 bg-white/75 p-3 text-sm text-slate-800">
								A ridosso del torneo, verrà inserito il menu giornaliero e i
								relativi prezzi. Ogni giorno la cucina sarà aperta dalle 18:00
								alle 22:00.
							</p>
						</div>
					</section>

					<div className="relative space-y-4">
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
											Momento speciale il giovedì
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

					<section className={cn('section-blur', 'highlights-card-v1')}>
						<div
							aria-hidden="true"
							className="menu-hero-overlay-v1 pointer-events-none absolute inset-0"
						/>
						<div
							aria-hidden="true"
							className="menu-hero-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
						/>
						<div className="relative grid gap-4">
							<div>
								<h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
									<Star className="h-5 w-5" />
									Sponsor
								</h2>
								<p className="mt-1 text-sm text-slate-800">
									Un grazie speciale ai partner che supportano il torneo.
								</p>
								<ul className="mt-2 grid gap-2 sm:grid-cols-2">
									{sponsors.map((sponsor) => (
										<li
											key={sponsor.name}
											className="flex items-center gap-2 rounded-lg border border-slate-300/70 bg-white/75 px-3 py-2 text-sm font-medium text-slate-900"
										>
											<img
												src={`/${sponsor.logo}`}
												alt={sponsor.name}
												className="object-contain"
											/>
										</li>
									))}
								</ul>
							</div>
						</div>
					</section>

					<section className={cn('section-blur', 'highlights-card-v1')}>
						<div
							aria-hidden="true"
							className="menu-hero-overlay-v1 pointer-events-none absolute inset-0"
						/>
						<div
							aria-hidden="true"
							className="menu-hero-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
						/>
						<div className="relative space-y-3">
							<h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
								<Info className="h-5 w-5" />
								Info utili
							</h2>
							<ul className="space-y-2">
								{latestInfo.map((info) => (
									<li
										key={info.title}
										className="rounded-lg border border-slate-300/70 bg-white/75 p-3"
									>
										<p className="text-sm font-semibold text-slate-900">
											{info.title}
										</p>
										<p className="mt-1 text-sm text-slate-800">
											{info.description}
										</p>
									</li>
								))}
							</ul>
						</div>
					</section>

					<section className={cn('section-blur', 'highlights-card-v1')}>
						<div
							aria-hidden="true"
							className="menu-hero-overlay-v1 pointer-events-none absolute inset-0"
						/>
						<div
							aria-hidden="true"
							className="menu-hero-grain pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
						/>
						<div className="relative space-y-4">
							<div>
								<h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
									<MapPin className="h-5 w-5" aria-hidden />
									Mappa del torneo
								</h2>
								<p className="mt-1 text-sm text-slate-800">
									Noi siamo qui! Apri Google Maps per le indicazioni stradali.
								</p>
							</div>
							<EventVenueMap />
						</div>
					</section>

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

/** Link West River nella card showcase */
const westRiverShowcaseLinks = {
	donationUrl: 'https://ideaginger.it/sostieni-3737.html',
	websiteUrl: 'https://westriver.altervista.org/',
	instagramUrl: 'https://www.instagram.com/westriver_asd/',
}

const newsItems = [
	{
		title: 'Regole speciali in arrivo',
		description:
			'Quest’anno introdurremo regole speciali per rendere le partite ancora più avvincenti ed emozionanti. I dettagli verranno comunicati passo passo.',
		badge: 'Seguiranno aggiornamenti',
	},
] as const

const organizationInfo = [
	{
		label: 'Formato evento',
		value: 'Torneo 3vs3 con fase a gironi, play-in, playoff e finali serali.',
	},
	{
		label: 'Fase a gironi e finali',
		value:
			'Dalla prima domenica fino al giovedì: gironi + play-in, domenica play-off e finali',
	},
]

const sponsors = [
	{ name: 'Punto3', logo: 'logo_punto3.png' },
	{ name: 'Ristorante Laghetto Longara', logo: 'logo_laghetto.jpg' },
]

const latestInfo = [
	{
		title: 'Check-in squadre',
		description:
			'Presentarsi almeno 20 minuti prima della prima partita per: registrazione giocatori, consegna divisa, pagamento e firma della liberatoria.',
	},
	{
		title: 'Comunicazioni live',
		description:
			'Seguici su Instagram e Facebook per variazioni orari, meteo e avvisi rapidi.',
	},
]
