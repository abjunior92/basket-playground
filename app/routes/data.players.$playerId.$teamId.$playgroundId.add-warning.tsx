import { PrismaClient } from '@prisma/client'
import { redirect, type ActionFunctionArgs } from '@remix-run/node'
import invariant from 'tiny-invariant'

const prisma = new PrismaClient()

export const action = async ({ params }: ActionFunctionArgs) => {
	invariant(params.playerId, 'playerId is required')
	invariant(params.teamId, 'teamId is required')
	invariant(params.playgroundId, 'playgroundId is required')

	const player = await prisma.player.findUnique({
		where: { id: params.playerId },
		select: { warnings: true, isExpelled: true },
	})

	if (player && !player.isExpelled) {
		await prisma.player.update({
			where: { id: params.playerId },
			data: {
				warnings: { increment: 1 },
				isExpelled: player.warnings + 1 >= 2 ? true : false,
			},
		})
	}

	return redirect(`/playgrounds/${params.playgroundId}/teams/${params.teamId}`)
}
