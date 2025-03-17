import { PrismaClient } from '@prisma/client'
import { redirect, type ActionFunctionArgs } from '@remix-run/node'
import invariant from 'tiny-invariant'
import { type PlayerLevels } from '~/lib/types'

const prisma = new PrismaClient()

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playerId, 'playerId is required')
	invariant(params.teamId, 'teamId is required')
	const formData = await request.formData()
	const name = formData.get('name') as string
	const surname = formData.get('surname') as string
	const birthYear = parseInt(formData.get('birthYear') as string)
	const level = formData.get('level') as PlayerLevels
	const paid = formData.get('paid') === 'on'

	await prisma.player.update({
		where: { id: params.playerId },
		data: {
			name,
			surname,
			birthYear,
			level,
			paid,
		},
	})

	return redirect(`/teams/${params.teamId}`)
}
