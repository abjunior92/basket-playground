import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { Award, BookOpenText, CalendarCog, Medal, Trophy } from 'lucide-react'
import invariant from 'tiny-invariant'
import InstagramIcon from '~/components/icons/Instagram'
import { cn } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Basket Playgrounds' },
		{ name: 'description', content: 'Basket Playgrounds' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')

	const playground = await prisma.playground.findUnique({
		where: { id: params.playgroundId },
	})
	const palmaresList = await prisma.tournamentPalmares.findMany({
		select: { year: true },
		orderBy: { year: 'desc' },
	})

	if (!playground) throw new Response('Not Found', { status: 404 })

	return { playground, palmaresList }
}

export default function Index() {
	const { playground, palmaresList } = useLoaderData<typeof loader>()

	return (
		<main className="flex px-4 py-4 md:h-screen md:items-center md:justify-center">
			<div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 md:gap-8">
				<header className={cn('section-blur', 'p-6')}>
					<h1 className="leading text-2xl font-bold text-gray-800">
						{playground.name}
					</h1>
					<p className="mt-2 text-sm text-slate-700">
						Accedi rapidamente alle sezioni principali, visualizza i tornei e le
						statistiche da un unico punto.
					</p>
				</header>

				<section className="section-blur">
					<h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
						<Trophy className="h-5 w-5" />
						<span>Torneo</span>
					</h2>
					<nav>
						<ul className="grid gap-2 md:grid-cols-2">
							{resources.map(({ href, text, icon }) => (
								<li key={href}>
									<Link
										className="nav-button"
										to={`/playground/${playground.id}${href}`}
									>
										<span>{icon}</span>
										<span>{text}</span>
									</Link>
								</li>
							))}
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
											className={cn('nav-button', 'justify-center')}
											to={`/playground/${playground.id}/palmares/${year}`}
										>
											<span>Anno {year}</span>
										</Link>
									</li>
								))
							) : (
								<li>Nessun palmares salvato</li>
							)}
						</ul>
					</nav>
				</section>

				<section className="section-blur">
					<h2 className="mb-4 flex items-center justify-center gap-2 text-lg font-semibold">
						<span>Seguici sui social</span>
					</h2>
					<nav className="flex items-center justify-center gap-2">
						<ul className="grid gap-2">
							<li>
								<Link
									to="https://www.instagram.com/torneodilongara/"
									target="_blank"
									rel="noreferrer"
								>
									<InstagramIcon size={24} />
									<span className="sr-only">Instagram</span>
								</Link>
							</li>
						</ul>
					</nav>
				</section>
			</div>
		</main>
	)
}

const resources = [
	{
		href: '/calendar',
		text: 'Calendario partite',
		icon: <CalendarCog />,
	},
	{
		href: '/finals',
		text: 'Playoff',
		icon: <Trophy />,
	},
	{
		href: '/rankings-and-stats',
		text: 'Classifiche',
		icon: <Medal />,
	},
	{
		href: '/rules',
		text: 'Regolamento',
		icon: <BookOpenText />,
	},
]
