import { type Level, PrismaClient, type Sizes } from '@prisma/client'
import { redirect, type ActionFunctionArgs } from '@remix-run/node'
import invariant from 'tiny-invariant'

const prisma = new PrismaClient()

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playerId, 'playerId is required')
	invariant(params.teamId, 'teamId is required')
	const formData = await request.formData()
	const name = formData.get('name') as string
	const surname = formData.get('surname') as string
	const birthYear = parseInt(formData.get('birthYear') as string)
	const level = formData.get('level') as Level
	const paid = formData.get('paid') === 'on'
	const size = formData.get('size') as Sizes

	await prisma.player.update({
		where: { id: params.playerId },
		data: {
			name,
			surname,
			birthYear,
			level,
			paid,
			size,
		},
	})

	return redirect(`/teams/${params.teamId}`)
}
