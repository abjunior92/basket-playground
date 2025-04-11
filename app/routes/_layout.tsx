import { type LoaderFunctionArgs } from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import { checkUserIsLoggedIn } from '~/utils/helpers'

export const loader = async ({ request }: LoaderFunctionArgs) => {
	await checkUserIsLoggedIn(request)
	return null
}

export default function Layout() {
	return (
		<main className="relative container mx-auto min-h-screen w-full">
			<div className="p-4 md:p-0">
				<Outlet />
			</div>
		</main>
	)
}
