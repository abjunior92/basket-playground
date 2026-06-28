import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'


export const action = async ({ params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	await prisma.playground.delete({
		where: { id: params.playgroundId },
	})

	return redirect('/playgrounds')
}
