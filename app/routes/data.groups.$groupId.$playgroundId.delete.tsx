import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'


export const action = async ({ params }: ActionFunctionArgs) => {
	invariant(params.groupId, 'groupId is required')
	invariant(params.playgroundId, 'playgroundId is required')
	await prisma.group.delete({
		where: { id: params.groupId },
	})

	return redirect(`/playgrounds/${params.playgroundId}`)
}
