import { type LoaderFunctionArgs } from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import { checkUserIsLoggedIn } from '~/utils/helpers'

export const loader = async ({ request }: LoaderFunctionArgs) => {
	await checkUserIsLoggedIn(request)
	return null
}

export default function Layout() {
	return (
		<main className="container mx-auto w-full p-6 md:p-4">
			<Outlet />
		</main>
	)
}
