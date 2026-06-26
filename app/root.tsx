import { type LinksFunction } from '@remix-run/node'
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
} from '@remix-run/react'

import './tailwind.css'
import { GoatCounter } from '~/components/goat-counter'
import { Toaster } from '~/components/ui/toaster'

export const loader = async () => {
	const siteCode = process.env.GOATCOUNTER_SITE_CODE?.trim()

	return {
		goatCounterEndpoint: siteCode
			? `https://${siteCode}.goatcounter.com/count`
			: null,
		goatCounterAllowLocal: process.env.NODE_ENV !== 'production',
	}
}

export const links: LinksFunction = () => [
	{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
	{
		rel: 'preconnect',
		href: 'https://fonts.gstatic.com',
		crossOrigin: 'anonymous',
	},
	{
		rel: 'stylesheet',
		href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
	},
]

const App = () => {
	const { goatCounterEndpoint, goatCounterAllowLocal } =
		useLoaderData<typeof loader>()

	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				<Outlet />
				<Toaster />
				{goatCounterEndpoint ? (
					<GoatCounter
						endpoint={goatCounterEndpoint}
						allowLocal={goatCounterAllowLocal}
					/>
				) : null}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}

export default App
