import { PrismaClient } from '@prisma/client'
import { type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { FacebookIcon } from 'icons/lucide-facebook'
import { InstagramIcon } from 'icons/lucide-instagram'
import {
	CalendarClock,
	HandPlatter,
	Info,
	MapPin,
	ShieldCheck,
	Star,
	Trophy,
} from 'lucide-react'
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

	return { playground }
}

export default function PlaygroundShowcasePage() {
	const { playground } = useLoaderData<typeof loader>()

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
								Ultime info
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

					<section className="section-blur">
						<div className="space-y-3 text-sm text-slate-900">
							<p className="flex items-center gap-2 font-semibold">
								<MapPin className="h-4 w-4" />
								<a
									href="https://maps.app.goo.gl/M4Ux1PdG3bkxzcY27"
									target="_blank"
									rel="noreferrer"
									className="underline"
								>
									Oratorio Il Tralcio, Longara
								</a>
							</p>
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
			'Presentarsi almeno 20 minuti prima della prima partita per: conferma roster, registrazione giocatori, eventuale pagamento e firma della liberatoria.',
	},
	{
		title: 'Comunicazioni live',
		description:
			'Seguici su Instagram e Facebook per variazioni orari, meteo e avvisi rapidi.',
	},
]
