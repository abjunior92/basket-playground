import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Form, Link, useLoaderData } from '@remix-run/react'
import { Award, Cog, LogOut, Trophy, UserCog } from 'lucide-react'
import { Button } from '~/components/ui/button'
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
		<main className="flex h-screen items-start justify-center md:items-center">
			<div className="flex flex-col items-center gap-8">
				<header className="flex flex-col items-center">
					<h1 className="leading text-center text-3xl font-bold text-gray-800 dark:text-gray-100">
						Welcome to Playgrounds 🏀
					</h1>
				</header>
				<h2 className="mt-4 text-xl font-bold">
					<div className="flex items-center space-x-2">
						<Cog className="h-5 w-5" />
						<span>Menù Admin</span>
					</div>
				</h2>
				<nav className="flex flex-col items-center justify-center">
					<ul className="space-y-4">
						{resources.map(({ href, text, icon }) => (
							<li key={href} className="nav-button">
								<Link to={href}>
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
						<Trophy className="h-5 w-5" />
						<span>Lista Tornei</span>
					</div>
				</h2>
				<nav className="flex flex-col items-center justify-center">
					<ul className="space-y-4">
						{playgrounds.length > 0 ? (
							playgrounds.map(({ id, name }) => (
								<li key={id} className="nav-button">
									<Link to={`/playground/${id}`}>
										<div className="flex items-center space-x-2">
											<span>{name}</span>
										</div>
									</Link>
								</li>
							))
						) : (
							<li>Nessun torneo disponibile</li>
						)}
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
									<Link to={`/palmares/${year}`}>
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

				<Form method="post" action="/logout">
					<Button type="submit" variant="outline">
						<LogOut className="h-5 w-5" />
						Logout
					</Button>
				</Form>
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
