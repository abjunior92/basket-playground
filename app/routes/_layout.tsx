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
			{/* <div className="absolute inset-0 bg-black/50 bg-[url(/logo_longara.JPG)] bg-cover bg-fixed bg-center bg-no-repeat opacity-15 blur-xs"></div> */}

			<div className="p-4 md:p-0">
				<Outlet />
			</div>
		</main>
	)
}
