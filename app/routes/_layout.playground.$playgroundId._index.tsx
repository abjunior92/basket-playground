import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import {
	CalendarCog,
	Home,
	Medal,
	PersonStanding,
	Shirt,
	Swords,
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
		<div className="flex h-screen items-center justify-center">
			<div className="flex flex-col items-center gap-8">
				<header className="flex flex-col items-center">
					<h1 className="leading text-2xl font-bold text-gray-800 dark:text-gray-100">
						{playground.name}
					</h1>
				</header>
				<nav className="flex flex-col items-center justify-center">
					<ul className="space-y-4">
						{resources.map(({ href, text, icon }) => (
							<li
								key={href}
								className="rounded-3xl border-2 border-white bg-black/80 text-white transition-colors duration-300 ease-in-out hover:bg-black/90"
							>
								<Link
									className="group flex items-center justify-start gap-3 p-3 leading-normal"
									to={`/playground/${playground.id}${href}`}
								>
									<div className="flex items-center space-x-2">
										<span>{icon}</span>
										<span>{text}</span>
									</div>
								</Link>
							</li>
						))}
					</ul>
				</nav>

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
		href: '/three-points-challenge',
		text: 'Gara da 3 punti',
		icon: <Swords />,
	},
	{
		href: '/jerseys',
		text: 'Gestione maglie',
		icon: <Shirt />,
	},
]
