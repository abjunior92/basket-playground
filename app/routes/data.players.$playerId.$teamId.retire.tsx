import { PrismaClient } from '@prisma/client'
import { redirect, type ActionFunctionArgs } from '@remix-run/node'
import invariant from 'tiny-invariant'

const prisma = new PrismaClient()

export const action = async ({ params }: ActionFunctionArgs) => {
	invariant(params.playerId, 'playerId is required')
	invariant(params.teamId, 'teamId is required')

	const player = await prisma.player.findUnique({
		where: { id: params.playerId },
		select: { retired: true },
	})

	if (player) {
		await prisma.player.update({
			where: { id: params.playerId },
			data: {
				retired: !player.retired,
			},
		})
	}

	return redirect(`/teams/${params.teamId}`)
}
