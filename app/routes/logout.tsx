import { type ActionFunctionArgs, redirect } from '@remix-run/node'
import { authSessionStorage } from '~/session.server'

export async function action({ request }: ActionFunctionArgs) {
	const session = await authSessionStorage.getSession(
		request.headers.get('Cookie'),
	)
	return redirect('/login', {
		headers: { 'Set-Cookie': await authSessionStorage.destroySession(session) },
	})
}

export const loader = action
