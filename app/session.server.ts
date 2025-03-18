import { createCookieSessionStorage } from '@remix-run/node'

export const authSessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'auth_session',
		secrets: ['s3gr3t0_d3ll4_s3ss10n3'],
		secure: process.env.NODE_ENV === 'production',
		httpOnly: true,
		path: '/',
		maxAge: 60 * 60 * 24 * 30,
		sameSite: 'lax',
	},
})
