import { PrismaClient } from '@prisma/client'
import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/react'
import invariant from 'tiny-invariant'
import {
	canAddTeamToGroup,
	getTeamsPerGroupLimit,
	TOURNAMENT_FORMAT_LABELS,
} from '~/lib/tournament-format'

const prisma = new PrismaClient()

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.teamId, 'teamId is required')
	invariant(params.groupId, 'groupId is required')
	invariant(params.playgroundId, 'playgroundId is required')
	const formData = await request.formData()
	const name = formData.get('name') as string
	const refPhoneNumber = formData.get('refPhoneNumber') as string
	const newGroupId = formData.get('groupId') as string

	// Verifichiamo che il team non abbia partite assegnate prima di cambiare girone
	if (newGroupId !== params.groupId) {
		const team = await prisma.team.findUnique({
			where: { id: params.teamId },
			include: {
				matchesAsTeam1: true,
				matchesAsTeam2: true,
			},
		})

		if (
			team &&
			(team.matchesAsTeam1.length > 0 || team.matchesAsTeam2.length > 0)
		) {
			throw new Response(
				'Non è possibile cambiare il girone di una squadra con partite assegnate',
				{
					status: 400,
				},
			)
		}

		const targetGroup = await prisma.group.findUnique({
			where: { id: newGroupId },
			include: {
				teams: true,
				playground: { select: { format: true } },
			},
		})

		if (!targetGroup) {
			throw new Response('Girone di destinazione non trovato', { status: 404 })
		}

		if (
			!canAddTeamToGroup(
				targetGroup.playground.format,
				targetGroup.teams.length,
			)
		) {
			const limit = getTeamsPerGroupLimit(targetGroup.playground.format)
			throw new Response(
				`Il girone di destinazione ha già raggiunto il limite di ${limit} squadre (${TOURNAMENT_FORMAT_LABELS[targetGroup.playground.format]}).`,
				{ status: 400 },
			)
		}
	}

	await prisma.team.update({
		where: { id: params.teamId },
		data: {
			name,
			refPhoneNumber,
			groupId: newGroupId || params.groupId,
		},
	})

	return redirect(
		`/playgrounds/${params.playgroundId}/groups/${newGroupId || params.groupId}`,
	)
}
