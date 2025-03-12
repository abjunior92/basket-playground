import { Outlet } from '@remix-run/react'

export default function Layout() {
	return (
		<main className="mx-auto w-full p-4">
			<Outlet />
		</main>
	)
}
