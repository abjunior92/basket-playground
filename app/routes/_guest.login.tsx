import { json, type ActionFunctionArgs, redirect } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { LogIn } from 'lucide-react'
import ErrorMessage from '~/components/ErrorMessage'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { authSessionStorage } from '~/session.server'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const email = formData.get('email')
	const password = formData.get('password')

	if (
		email !== process.env.ADMIN_EMAIL ||
		password !== process.env.ADMIN_PASSWORD
	) {
		return json({ error: 'Credenziali non valide' }, { status: 401 })
	}

	// Creiamo la sessione
	const session = await authSessionStorage.getSession()
	session.set('isAdmin', true)

	return redirect('/', {
		headers: { 'Set-Cookie': await authSessionStorage.commitSession(session) },
	})
}

export default function LoginPage() {
	const actionData = useActionData<typeof action>()

	return (
		<div className="flex h-screen flex-col items-center justify-center space-y-4">
			<h1 className="text-2xl font-bold">Login</h1>
			<Form method="post" className="flex flex-col space-y-4">
				<label htmlFor="email">
					Email
					<Input
						type="email"
						name="email"
						placeholder="Inserisci email"
						required
					/>
				</label>
				<label htmlFor="password">
					Password
					<Input
						type="password"
						name="password"
						placeholder="Inserisci password"
						required
					/>
				</label>
				<Button type="submit">
					Login
					<LogIn className="h-5 w-5" />
				</Button>
				{actionData && 'error' in actionData && (
					<ErrorMessage message={actionData.error} />
				)}
			</Form>
		</div>
	)
}
