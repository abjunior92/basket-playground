import { Outlet } from '@remix-run/react'

export default function Layout() {
	return (
		<main className="container mx-auto w-full p-6 md:p-4">
			<Outlet />
		</main>
	)
}
