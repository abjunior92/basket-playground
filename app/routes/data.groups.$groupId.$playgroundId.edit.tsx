import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { prisma } from '~/db.server'


export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.groupId, 'groupId is required')
	invariant(params.playgroundId, 'playgroundId is required')
	const formData = await request.formData()
	const name = formData.get('name') as string

	await prisma.group.update({
		where: { id: params.groupId },
		data: { name },
	})

	return redirect(`/playgrounds/${params.playgroundId}`)
}
