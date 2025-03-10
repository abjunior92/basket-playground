import { PrismaClient } from '@prisma/client'
import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/react'
import invariant from 'tiny-invariant'

const prisma = new PrismaClient()

export const action = async ({ params }: ActionFunctionArgs) => {
	invariant(params.teamId, 'teamId is required')
	invariant(params.groupId, 'groupId is required')
	await prisma.team.delete({
		where: { id: params.teamId },
	})

	return redirect(`/groups/${params.groupId}`)
}
