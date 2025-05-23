import { PrismaClient } from '@prisma/client'
import { redirect, type ActionFunctionArgs } from '@remix-run/node'
import invariant from 'tiny-invariant'

const prisma = new PrismaClient()

export const action = async ({ params, request }: ActionFunctionArgs) => {
	invariant(params.playerId, 'playerId is required')
	invariant(params.teamId, 'teamId is required')
	invariant(params.playgroundId, 'playgroundId is required')

	const url = new URL(request.url)
	const matchId = url.searchParams.get('matchId')

	const player = await prisma.player.findUnique({
		where: { id: params.playerId },
		select: { warnings: true, isExpelled: true },
	})

	if (player && !player.isExpelled) {
		await prisma.player.update({
			where: { id: params.playerId },
			data: {
				warnings: 2,
				isExpelled: true,
			},
		})
	}

	if (matchId) {
		return redirect(
			`/playground/${params.playgroundId}/matches/${matchId}/edit`,
		)
	}

	return redirect(`/playgrounds/${params.playgroundId}/teams/${params.teamId}`)
}
