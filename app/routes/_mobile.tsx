import { Outlet } from '@remix-run/react'

export default function Layout() {
	return (
		<main className="container mx-auto w-full max-w-lg p-4">
			<Outlet />
		</main>
	)
}
