import { PrismaClient } from '@prisma/client'
import { redirect, type ActionFunctionArgs } from '@remix-run/node'
import invariant from 'tiny-invariant'

const prisma = new PrismaClient()

export const action = async ({ params }: ActionFunctionArgs) => {
	invariant(params.playerId, 'playerId is required')
	invariant(params.teamId, 'teamId is required')

	const player = await prisma.player.findUnique({
		where: { id: params.playerId },
		select: { warnings: true, isExpelled: true },
	})

	if (player && player.warnings > 0) {
		await prisma.player.update({
			where: { id: params.playerId },
			data: {
				warnings: { decrement: 1 },
				isExpelled: false,
			},
		})
	}

	return redirect(`/teams/${params.teamId}`)
}
