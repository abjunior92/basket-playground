import { Outlet } from '@remix-run/react'

export default function Layout() {
	return (
		<main className="container mx-auto max-w-4xl p-4">
			<Outlet />
		</main>
	)
}
