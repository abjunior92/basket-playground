import { Outlet } from '@remix-run/react'

export default function Layout() {
	return (
		<main className="relative container mx-auto h-screen w-full">
			<Outlet />
		</main>
	)
}
