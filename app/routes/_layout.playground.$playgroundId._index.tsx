import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import {
	Award,
	CalendarCog,
	Flame,
	Home,
	Medal,
	PersonStanding,
	Shirt,
	Swords,
	Trophy,
} from 'lucide-react'
import invariant from 'tiny-invariant'
import { Button } from '~/components/ui/button'
import { checkUserIsLoggedIn } from '~/utils/helpers'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Basket Playgrounds' },
		{ name: 'description', content: 'Basket Playgrounds' },
	]
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	await checkUserIsLoggedIn(request)

	const playground = await prisma.playground.findUnique({
		where: { id: params.playgroundId },
	})

	if (!playground) throw new Response('Not Found', { status: 404 })

	return { playground }
}

export default function Index() {
	const { playground } = useLoaderData<typeof loader>()

	return (
		<div className="flex h-full grow flex-col items-center justify-center">
			<div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8">
				<header className="section-blur">
					<h1 className="leading mb-4 text-2xl font-bold text-gray-800">
						{playground.name}
					</h1>
					<nav>
						<ul className="grid gap-2 md:grid-cols-2">
							{resources.map(({ href, text, icon }) => (
								<li key={href}>
									<Link
										className="nav-button group"
										to={`/playground/${playground.id}${href}`}
									>
										<span className="nav-button-animate-icon">{icon}</span>
										<span>{text}</span>
									</Link>
								</li>
							))}
						</ul>
					</nav>
				</header>

				<Button asChild variant="outline">
					<Link to="/">
						<Home className="h-5 w-5" />
						Home
					</Link>
				</Button>
			</div>
		</div>
	)
}

const resources = [
	{
		href: '/matches',
		text: 'Calendario partite',
		icon: <CalendarCog />,
	},
	{
		href: '/players',
		text: 'Giocatori',
		icon: <PersonStanding />,
	},
	{
		href: '/rankings',
		text: 'Classifiche',
		icon: <Medal />,
	},
	{
		href: '/highlights',
		text: 'Highlights',
		icon: <Flame />,
	},
	{
		href: '/playoff',
		text: 'Playoff',
		icon: <Trophy />,
	},
	{
		href: '/three-points-challenge',
		text: 'Gara da 3 punti',
		icon: <Swords />,
	},
	{
		href: '/jerseys',
		text: 'Gestione maglie',
		icon: <Shirt />,
	},
	{
		href: '/palmares',
		text: 'Palmares',
		icon: <Award />,
	},
]
