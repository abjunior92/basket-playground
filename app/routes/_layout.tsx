import { type LoaderFunctionArgs } from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import { checkUserIsLoggedIn } from '~/utils/helpers'

export const loader = async ({ request }: LoaderFunctionArgs) => {
	await checkUserIsLoggedIn(request)
	return null
}

export default function Layout() {
	return (
		<main className="relative container mx-auto flex min-h-screen w-full flex-col p-4 md:p-0">
			<Outlet />
		</main>
	)
}
