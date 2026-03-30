import { type Level, PrismaClient, type Sizes } from '@prisma/client'
import { json, type ActionFunctionArgs } from '@remix-run/node'
import invariant from 'tiny-invariant'

const prisma = new PrismaClient()

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	invariant(params.playerId, 'playerId is required')
	invariant(params.teamId, 'teamId is required')

	const playgroundId = params.playgroundId
	const playerId = params.playerId
	const teamId = params.teamId

	const formData = await request.formData()
	const name = formData.get('name') as string
	const surname = formData.get('surname') as string
	const birthYear = parseInt(formData.get('birthYear') as string)
	const level = formData.get('level') as Level
	const paid = formData.get('paid') === 'on'
	const sizeRaw = formData.get('size')
	const size =
		typeof sizeRaw !== 'string' || sizeRaw === ''
			? undefined
			: sizeRaw === '__none__'
				? null
				: (sizeRaw as Sizes)

	if (!name || !surname || !birthYear || !level) {
		return json(
			{ error: 'Compila tutti i campi correttamente!' },
			{ status: 400 },
		)
	}

	// Prendiamo la vecchia taglia
	const player = await prisma.player.findUnique({
		where: {
			id: playerId,
			teamId: teamId,
			playgroundId: playgroundId,
		},
		select: { size: true },
	})

	const oldSize = player?.size

	const INSUFFICIENT_STOCK_ERROR = 'INSUFFICIENT_STOCK'

	try {
		// Aggiorniamo stock e player SOLO SE la taglia è cambiata
		// (e la nuova taglia è disponibile nello stock).
		await prisma.$transaction(async (tx) => {
			if (oldSize !== size) {
				// 1) Se sta assegnando una nuova taglia, verifichiamo che ci sia almeno
				//    1 disponibilità libera nello stock (available > 0).
				if (size) {
					const updateResult = await tx.jerseyStock.updateMany({
						where: {
							playgroundId,
							size,
							available: { gt: 0 },
						},
						data: {
							distributed: { increment: 1 },
							available: { decrement: 1 },
						},
					})

					if (updateResult.count !== 1) {
						throw new Error(INSUFFICIENT_STOCK_ERROR)
					}
				}

				// 2) Se il player aveva già una taglia, la "restituiamo" allo stock.
				if (oldSize) {
					await tx.jerseyStock.update({
						where: {
							playgroundId_size: {
								playgroundId,
								size: oldSize,
							},
						},
						data: {
							distributed: { decrement: 1 },
							available: { increment: 1 },
						},
					})
				}
			}

			// 3) Aggiorniamo il player (sempre).
			await tx.player.update({
				where: {
					id: playerId,
					teamId: teamId,
					playgroundId,
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
		})
	} catch (err) {
		if (err instanceof Error && err.message === INSUFFICIENT_STOCK_ERROR) {
			const sizeLabel = size ? size.toUpperCase() : 'SCONOSCIUTA'
			return json(
				{
					error: `La taglia selezionata (${sizeLabel}) non è disponibile nello stock.`,
				},
				{ status: 400 },
			)
		}
		throw err
	}

	return { ok: true }
}
