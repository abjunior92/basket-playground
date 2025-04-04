import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Form, Link, useLoaderData } from '@remix-run/react'
import { Award, LogOut, Trophy, UserCog } from 'lucide-react'
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
	return { playgrounds }
}

export default function Index() {
	const { playgrounds } = useLoaderData<typeof loader>()

	return (
		<div className="flex h-screen items-center justify-center">
			<div className="flex flex-col items-center gap-8">
				<header className="flex flex-col items-center">
					<h1 className="leading text-center text-3xl font-bold text-gray-800 dark:text-gray-100">
						Welcome to Playgrounds 🏀
					</h1>
				</header>
				<h2 className="mt-4 text-xl font-bold">Menù Admin</h2>
				<nav className="flex flex-col items-center justify-center">
					<ul className="space-y-4">
						{resources.map(({ href, text, icon }) => (
							<li
								key={href}
								className="rounded-3xl border border-gray-200 transition-colors duration-300 ease-in-out hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
							>
								<Link
									className="group flex items-center justify-start gap-3 p-3 leading-normal"
									to={href}
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
				<h2 className="mt-4 text-xl font-bold">Lista Tornei</h2>
				<nav className="flex flex-col items-center justify-center">
					<ul className="space-y-4">
						{playgrounds.length > 0 ? (
							playgrounds.map(({ id, name }) => (
								<li
									key={id}
									className="rounded-3xl border bg-gray-200 transition-colors duration-300 ease-in-out hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
								>
									<Link
										className="group flex items-center justify-start gap-3 p-3 leading-normal"
										to={`/playground/${id}`}
									>
										<div className="flex items-center space-x-2">
											<Award className="h-5 w-5" />
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

				<Form method="post" action="/logout">
					<Button type="submit">
						<LogOut className="h-5 w-5" />
						Logout
					</Button>
				</Form>
			</div>
		</div>
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
