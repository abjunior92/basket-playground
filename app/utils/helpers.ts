import { redirect } from '@remix-run/node'
import { authSessionStorage } from '~/session.server'

export const checkUserIsLoggedIn = async (request: Request) => {
	const session = await authSessionStorage.getSession(
		request.headers.get('Cookie'),
	)

	const isAdmin = session.get('isAdmin')

	if (!isAdmin) {
		throw redirect('/login')
	}

	return null
}
