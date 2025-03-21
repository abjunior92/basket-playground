import { type Level, PrismaClient, type Sizes } from '@prisma/client'
import { json, type ActionFunctionArgs } from '@remix-run/node'
import invariant from 'tiny-invariant'

const prisma = new PrismaClient()

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	invariant(params.playerId, 'playerId is required')
	invariant(params.teamId, 'teamId is required')
	const formData = await request.formData()
	const name = formData.get('name') as string
	const surname = formData.get('surname') as string
	const birthYear = parseInt(formData.get('birthYear') as string)
	const level = formData.get('level') as Level
	const paid = formData.get('paid') === 'on'
	const size =
		formData.get('size') === '' ? undefined : (formData.get('size') as Sizes)

	if (!name || !surname || !birthYear || !level) {
		return json(
			{ error: 'Compila tutti i campi correttamente!' },
			{ status: 400 },
		)
	}

	// Prendiamo la vecchia taglia
	const player = await prisma.player.findUnique({
		where: {
			id: params.playerId,
			teamId: params.teamId,
			playgroundId: params.playgroundId,
		},
		select: { size: true },
	})

	const oldSize = player?.size

	// Aggiorniamo lo stock SOLO SE la taglia è cambiata
	if (oldSize && oldSize !== size) {
		// 1. Se il player aveva già una taglia e la sta cambiando
		if (oldSize) {
			await prisma.jerseyStock.update({
				where: {
					playgroundId_size: {
						playgroundId: params.playgroundId,
						size: oldSize,
					},
				},
				data: {
					distributed: { decrement: 1 },
					available: { increment: 1 },
				},
			})
		}

		// 2. Se il player ha una nuova taglia (o la sta modificando)
		if (size) {
			await prisma.jerseyStock.upsert({
				where: {
					playgroundId_size: { playgroundId: params.playgroundId, size },
				},
				update: {
					distributed: { increment: 1 },
					available: { decrement: 1 },
				},
				create: {
					size: size,
					available: 0,
					distributed: 1,
					playgroundId: params.playgroundId,
				},
			})
		}
	}

	// 3. Aggiorniamo il player
	await prisma.player.update({
		where: {
			id: params.playerId,
			teamId: params.teamId,
			playgroundId: params.playgroundId,
		},
		data: {
			name,
			surname,
			birthYear,
			level,
			paid,
			size,
		},
	})

	return { ok: true }
}
