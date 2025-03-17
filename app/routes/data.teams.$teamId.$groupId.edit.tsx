import { PrismaClient } from '@prisma/client'
import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/react'
import invariant from 'tiny-invariant'

const prisma = new PrismaClient()

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.teamId, 'teamId is required')
	invariant(params.groupId, 'groupId is required')
	const formData = await request.formData()
	const name = formData.get('name') as string
	const refPhoneNumber = formData.get('refPhoneNumber') as string

	await prisma.team.update({
		where: { id: params.teamId },
		data: { name, refPhoneNumber },
	})

	return redirect(`/groups/${params.groupId}`)
}
