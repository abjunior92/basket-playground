import { type MetaFunction } from '@remix-run/node'

export const meta: MetaFunction = () => {
	return [
		{ title: 'New Remix App' },
		{ name: 'description', content: 'Welcome to Remix!' },
	]
}

export default function Index() {
	return (
		<div className="flex h-screen items-center justify-center">
			<div className="flex flex-col items-center gap-16">
				<header className="flex flex-col items-center gap-9">
					<h1 className="leading text-2xl font-bold text-gray-800 dark:text-gray-100">
						Welcome to Playgrounds
					</h1>
				</header>
				<nav className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-gray-200 p-6 dark:border-gray-700">
					<p className="leading-6 text-gray-700 dark:text-gray-200">Naviga</p>
					<ul>
						{resources.map(({ href, text, icon }) => (
							<li key={href}>
								<a
									className="group flex items-center gap-3 self-stretch p-3 leading-normal text-blue-700 hover:underline dark:text-blue-500"
									href={href}
								>
									<div className="flex items-center space-x-2">
										<span>{icon}</span>
										<span>{text}</span>
									</div>
								</a>
							</li>
						))}
					</ul>
				</nav>
			</div>
		</div>
	)
}

const resources = [
	{
		href: '/playgrounds',
		text: 'Gestione Tornei',
		icon: '🏀',
	},
	{
		href: '/tournament',
		text: 'Panoramica tornei',
		icon: '🏆',
	},
	{
		href: '/matches',
		text: 'Calendario partite',
		icon: '🗓️',
	},
	{
		href: '/matches/new',
		text: 'Aggiungi partita',
		icon: '🆚',
	},
	{
		href: '/players',
		text: 'Giocatori',
		icon: '⛹🏻‍♂️',
	},
]
