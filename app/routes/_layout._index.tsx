import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Form, Link, useLoaderData } from '@remix-run/react'
import { FacebookIcon } from 'icons/lucide-facebook'
import { InstagramIcon } from 'icons/lucide-instagram'
import { Award, Cog, LogOut, Trophy, UserCog } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { checkUserIsLoggedIn } from '~/utils/helpers'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Basket Playgrounds' },
		{ name: 'description', content: 'Basket Playgrounds' },
	]
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
	await checkUserIsLoggedIn(request)

	const playgrounds = await prisma.playground.findMany()
	const palmaresList = await prisma.tournamentPalmares.findMany({
		select: { year: true },
		orderBy: { year: 'desc' },
	})

	return { playgrounds, palmaresList }
}

export default function Index() {
	const { playgrounds, palmaresList } = useLoaderData<typeof loader>()

	return (
		<main className="flex bg-white/20 px-4 py-4 text-slate-800 md:h-screen md:items-center md:justify-center md:px-8 md:py-12">
			<div className="mx-auto flex w-full max-w-lg flex-col gap-4 md:gap-8">
				<header className={cn('section-blur', 'p-6')}>
					<p className="text-sm font-medium tracking-wide text-slate-600">
						Longara 3vs3 Playground
					</p>
					<h1 className="mt-2 flex items-center gap-2 text-3xl font-bold md:text-4xl">
						<span>Il Tralcio</span>
						<span
							aria-hidden="true"
							className="inline-block motion-safe:animate-bounce"
						>
							🏀
						</span>
					</h1>
					<p className="mt-2 text-sm text-slate-700">
						Accedi rapidamente alle sezioni principali, gestisci i tornei e le
						statistiche da un unico punto.
					</p>
				</header>

				<section className="section-blur">
					<h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
						<Cog className="h-5 w-5" />
						<span>Menù Admin</span>
					</h2>
					<nav>
						<ul className="grid gap-2 md:grid-cols-2">
							{resources.map(({ href, text, icon }) => (
								<li key={href}>
									<Link to={href} className="nav-button group">
										<span className="nav-button-animate-icon">{icon}</span>
										<span>{text}</span>
									</Link>
								</li>
							))}
						</ul>
					</nav>
				</section>

				<section className="section-blur">
					<h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
						<Trophy className="h-5 w-5" />
						<span>Torneo</span>
					</h2>
					<nav>
						<ul className="space-y-3">
							{playgrounds.length > 0 ? (
								playgrounds.map(({ id, name }) => (
									<li key={id}>
										<Link
											to={`/playground/${id}`}
											className={cn('nav-button group', 'justify-center')}
										>
											<span className="nav-button-animate-text">{name}</span>
										</Link>
									</li>
								))
							) : (
								<li className="rounded-xl border border-dashed border-slate-400/80 bg-white/40 px-4 py-3 text-sm text-slate-600">
									Nessun torneo disponibile
								</li>
							)}
						</ul>
					</nav>
				</section>

				<section className="section-blur">
					<h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
						<Award className="h-5 w-5" />
						<span>Palmares</span>
					</h2>
					<nav>
						<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{palmaresList.length > 0 ? (
								palmaresList.map(({ year }) => (
									<li key={year}>
										<Link
											to={`/palmares/${year}`}
											className={cn('nav-button group', 'justify-center')}
										>
											<span className="nav-button-animate-text">
												Anno {year}
											</span>
										</Link>
									</li>
								))
							) : (
								<li className="rounded-xl border border-dashed border-slate-400/80 bg-white/40 px-4 py-3 text-sm text-slate-600">
									Nessun palmares salvato
								</li>
							)}
						</ul>
					</nav>
				</section>

				<div className="flex items-center justify-between">
					<Form method="post" action="/logout" className="self-start">
						<Button type="submit" variant="outline">
							<LogOut className="h-5 w-5" />
							Logout
						</Button>
					</Form>
					<nav className="flex items-center justify-center gap-2">
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
				</div>
			</div>
		</main>
	)
}

const resources = [
	{
		href: '/playgrounds',
		text: 'Gestione Tornei',
		icon: <UserCog />,
	},
	{
		href: '/tournament',
		text: 'Panoramica tornei',
		icon: <Trophy />,
	},
]
