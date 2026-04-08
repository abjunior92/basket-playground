import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { Award, BookOpenText, CalendarCog, Medal, Trophy } from 'lucide-react'
import invariant from 'tiny-invariant'

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
		<main className="flex h-screen items-center justify-center">
			<div className="flex flex-col items-center gap-8">
				<header className="flex flex-col items-center">
					<h1 className="leading text-2xl font-bold text-gray-800 dark:text-gray-100">
						{playground.name}
					</h1>
				</header>
				<nav className="flex flex-col items-center justify-center">
					<ul className="space-y-4">
						{resources.map(({ href, text, icon }) => (
							<li key={href} className="nav-button">
								<Link to={`/playground/${playground.id}${href}`}>
									<div className="flex items-center space-x-2">
										<span>{icon}</span>
										<span>{text}</span>
									</div>
								</Link>
							</li>
						))}
					</ul>
				</nav>
				<h2 className="mt-4 text-xl font-bold">
					<div className="flex items-center space-x-2">
						<Award className="h-5 w-5" />
						<span>Palmares</span>
					</div>
				</h2>
				<nav className="flex flex-col items-center justify-center">
					<ul className="space-y-4">
						{palmaresList.length > 0 ? (
							palmaresList.map(({ year }) => (
								<li key={year} className="nav-button">
									<Link to={`/playground/${playground.id}/palmares/${year}`}>
										<div className="flex items-center space-x-2">
											<span>Anno {year}</span>
										</div>
									</Link>
								</li>
							))
						) : (
							<li>Nessun palmares salvato</li>
						)}
					</ul>
				</nav>
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
