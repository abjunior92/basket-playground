import { PrismaClient } from '@prisma/client'
import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/react'
import invariant from 'tiny-invariant'

const prisma = new PrismaClient()

export const action = async ({ params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	await prisma.playground.delete({
		where: { id: params.playgroundId },
	})

	return redirect('/playgrounds')
}
