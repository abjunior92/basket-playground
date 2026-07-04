import { prisma } from '~/db.server'

export async function deleteMatch(matchId: string, playgroundId: string) {
	await prisma.$transaction(async (tx) => {
		const match = await tx.match.findFirst({
			where: { id: matchId, playgroundId },
			select: { id: true },
		})

		if (!match) {
			throw new Error('Partita non trovata')
		}

		const playerStats = await tx.playerMatchStats.findMany({
			where: { matchId },
			select: { playerId: true, points: true },
		})

		for (const stat of playerStats) {
			await tx.player.update({
				where: { id: stat.playerId },
				data: {
					totalPoints: { decrement: stat.points },
				},
			})
		}

		await tx.playerMatchStats.deleteMany({
			where: { matchId },
		})

		await tx.match.delete({
			where: { id: matchId },
		})
	})
}
