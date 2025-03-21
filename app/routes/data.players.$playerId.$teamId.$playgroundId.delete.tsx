import { PrismaClient } from '@prisma/client'
import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/react'
import invariant from 'tiny-invariant'

const prisma = new PrismaClient()

export const action = async ({ params }: ActionFunctionArgs) => {
	invariant(params.playerId, 'playerId is required')
	invariant(params.teamId, 'teamId is required')
	invariant(params.playgroundId, 'playgroundId is required')
	await prisma.player.delete({
		where: { id: params.playerId },
	})

	return redirect(`/playgrounds/${params.playgroundId}/teams/${params.teamId}`)
}
