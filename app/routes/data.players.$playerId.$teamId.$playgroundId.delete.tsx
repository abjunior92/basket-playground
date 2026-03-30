import { PrismaClient } from '@prisma/client'
import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/react'
import invariant from 'tiny-invariant'

const prisma = new PrismaClient()

export const action = async ({ params }: ActionFunctionArgs) => {
	invariant(params.playerId, 'playerId is required')
	invariant(params.teamId, 'teamId is required')
	invariant(params.playgroundId, 'playgroundId is required')

	const playerId = params.playerId
	const teamId = params.teamId
	const playgroundId = params.playgroundId

	await prisma.$transaction(async (tx) => {
		// Se il giocatore aveva una taglia, la restituiamo allo stock.
		const player = await tx.player.findUnique({
			where: { id: playerId },
			select: { size: true, teamId: true, playgroundId: true },
		})

		if (player?.size && player.teamId === teamId) {
			await tx.jerseyStock.upsert({
				where: { playgroundId_size: { playgroundId, size: player.size } },
				update: {
					available: { increment: 1 },
					distributed: { decrement: 1 },
				},
				create: {
					size: player.size,
					available: 1,
					distributed: 0,
					playgroundId,
				},
			})
		}

		await tx.player.delete({
			where: { id: playerId },
		})
	})

	return redirect(`/playgrounds/${playgroundId}/teams/${teamId}`)
}
