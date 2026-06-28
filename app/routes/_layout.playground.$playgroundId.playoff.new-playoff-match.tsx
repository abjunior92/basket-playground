import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData, useParams } from '@remix-run/react'
import { Plus } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { prisma } from '~/db.server'
import { loadPlayoffQualificationContext } from '~/lib/playoff-qualification.server'
import { colorGroupClasses } from '~/lib/types'
import { cn, getDayLabel, getFinalTimeSlots, getMatchLabel } from '~/lib/utils'


export const meta: MetaFunction = () => {
	return [
		{ title: 'Nuova Partita Playoff' },
		{ name: 'description', content: 'Crea una nuova partita playoff' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')

	const { directPlayoffTeams, playinTeams } =
		await loadPlayoffQualificationContext(prisma, params.playgroundId)

	const playinMatches = await prisma.match.findMany({
		where: {
			playgroundId: params.playgroundId,
			day: 5,
			OR: [
				{
					team1: {
						id: { in: playinTeams.map((team) => team.id) },
					},
				},
				{
					team2: {
						id: { in: playinTeams.map((team) => team.id) },
					},
				},
			],
		},
		include: {
			team1: { include: { group: true } },
			team2: { include: { group: true } },
		},
		orderBy: [{ timeSlot: 'asc' }, { field: 'asc' }],
	})

	const playinWinners = playinMatches
		.filter((match) => match.winner !== null)
		.map((match) => {
			const winningTeam =
				match.winner === match.team1Id ? match.team1 : match.team2
			return {
				id: winningTeam.id,
				name: winningTeam.name,
				group: winningTeam.group,
				matchesPlayed: 0,
				matchesWon: 0,
				pointsScored: 0,
				pointsConceded: 0,
				winPercentage: 0,
				pointsDifference: 0,
				pointsGroup: 0,
			}
		})

	const existingPlayoffMatches = await prisma.match.findMany({
		where: {
			playgroundId: params.playgroundId,
			day: 7,
		},
		include: {
			team1: { include: { group: true } },
			team2: { include: { group: true } },
		},
		orderBy: [{ timeSlot: 'asc' }, { field: 'asc' }],
	})

	const allPlayoffTeams = [...directPlayoffTeams, ...playinWinners]

	return {
		allPlayoffTeams,
		existingPlayoffMatches,
	}
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const formData = await request.formData()

	const day = Number(formData.get('day') as string)
	const timeSlot = formData.get('timeSlot') as string
	const field = formData.get('field') as string
	const team1Id = formData.get('team1Id') as string
	const team2Id = formData.get('team2Id') as string

	if (!day || !timeSlot || !field || !team1Id || !team2Id) {
		return json({ error: 'Tutti i campi sono obbligatori' }, { status: 400 })
	}

	if (team1Id === team2Id) {
		return json(
			{ error: 'Le due squadre non possono essere uguali' },
			{ status: 400 },
		)
	}

	// Controllo se una squadra gioca già in quello slot
	const existingMatch = await prisma.match.findFirst({
		where: {
			playgroundId: params.playgroundId,
			day,
			timeSlot,
			OR: [
				{ team1Id },
				{ team2Id },
				{ team1Id: team2Id },
				{ team2Id: team1Id },
			],
		},
	})

	if (existingMatch) {
		return json(
			{ error: 'Una squadra è già impegnata in questo orario' },
			{ status: 400 },
		)
	}

	// Crea la nuova partita
	await prisma.match.create({
		data: {
			playgroundId: params.playgroundId,
			day,
			timeSlot,
			field,
			team1Id,
			team2Id,
		},
	})

	return redirect(`/playground/${params.playgroundId}/playoff`)
}

export default function NewPlayoffMatch() {
	const { allPlayoffTeams, existingPlayoffMatches } =
		useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const params = useParams()

	const timeSlots = getFinalTimeSlots()

	return (
		<div className="md:p-4">
			<Header
				title="Nuova Partita Playoff"
				backLink={`/playground/${params.playgroundId}/playoff`}
				icon={<Plus />}
			/>

			<Card className="mx-auto mt-4 max-w-2xl">
				<CardHeader>
					<CardTitle>Crea accoppiamento Playoff</CardTitle>
				</CardHeader>
				<CardContent>
					<Form method="post" className="space-y-4">
						<div>
							<label htmlFor="day" className="mb-2 block text-sm font-medium">
								Giorno:
							</label>
							<Select name="day" defaultValue="5" value="7">
								<SelectTrigger>
									<SelectValue placeholder="Seleziona un giorno" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Giorno</SelectLabel>
										<SelectItem value="7">{getDayLabel('7')}</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						<div>
							<label
								htmlFor="timeSlot"
								className="mb-2 block text-sm font-medium"
							>
								Orario:
							</label>
							<Select name="timeSlot">
								<SelectTrigger>
									<SelectValue placeholder="Seleziona un orario" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Orario</SelectLabel>
										{timeSlots.map((slot) => (
											<SelectItem key={slot} value={slot}>
												{`${getMatchLabel(slot)} - ${slot}`}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						<div>
							<label htmlFor="field" className="mb-2 block text-sm font-medium">
								Campo:
							</label>
							<Select name="field">
								<SelectTrigger>
									<SelectValue placeholder="Seleziona un campo" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Campo</SelectLabel>
										{['A', 'B'].map((field) => (
											<SelectItem key={field} value={field}>
												{field}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						<div>
							<label
								htmlFor="team1Id"
								className="mb-2 block text-sm font-medium"
							>
								Squadra 1:
							</label>
							<Select name="team1Id">
								<SelectTrigger>
									<SelectValue placeholder="Seleziona una squadra" />
								</SelectTrigger>
								<SelectContent>
									{allPlayoffTeams.map((team) => (
										<SelectItem key={team.id} value={team.id}>
											{team.name} ({team.group.name})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<label
								htmlFor="team2Id"
								className="mb-2 block text-sm font-medium"
							>
								Squadra 2:
							</label>
							<Select name="team2Id">
								<SelectTrigger>
									<SelectValue placeholder="Seleziona una squadra avversaria" />
								</SelectTrigger>
								<SelectContent>
									{allPlayoffTeams.map((team) => (
										<SelectItem key={team.id} value={team.id}>
											{team.name} ({team.group.name})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{actionData && 'error' in actionData && (
							<div className="text-sm text-red-500">{actionData.error}</div>
						)}

						<div className="flex items-center gap-x-2">
							<Button type="submit" className="w-full md:w-auto">
								Crea Partita
							</Button>
						</div>
					</Form>
				</CardContent>
			</Card>

			{/* Sezione Partite Esistenti */}
			{existingPlayoffMatches.length > 0 && (
				<Card className="mx-auto mt-6 max-w-4xl">
					<CardHeader>
						<CardTitle>Partite Playoff Esistenti</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{existingPlayoffMatches.map((match) => {
								const isTeam1Winner = match.winner === match.team1Id
								const isTeam2Winner = match.winner === match.team2Id
								return (
									<div key={match.id} className="rounded-lg border p-3 md:p-4">
										{/* Header con orario e campo */}
										<div className="text-muted-foreground mb-3 flex items-center justify-between text-sm">
											<span>
												{match.timeSlot} - Campo {match.field}
											</span>
										</div>

										{/* Layout desktop */}
										<div className="hidden md:flex md:items-center md:justify-between">
											<div className="flex items-center gap-4">
												<div className="flex items-center gap-2">
													<Badge
														className={
															colorGroupClasses[match.team1.group.color]
														}
													>
														{match.team1.group.name}
													</Badge>
													<span className="font-medium">
														{isTeam1Winner && '🏆 '}
														{match.team1.name}
													</span>
												</div>
												<div className="text-muted-foreground">vs</div>
												<div className="flex items-center gap-2">
													<Badge
														className={
															colorGroupClasses[match.team2.group.color]
														}
													>
														{match.team2.group.name}
													</Badge>
													<span className="font-medium">
														{isTeam2Winner && '🏆 '}
														{match.team2.name}
													</span>
												</div>
											</div>
											<div className="flex items-center gap-2">
												{match.score1 !== null && match.score2 !== null ? (
													<div className="font-mono text-lg tabular-nums">
														<span
															className={cn(
																isTeam1Winner && 'font-bold text-green-600',
															)}
														>
															{match.score1}
														</span>{' '}
														-{' '}
														<span
															className={cn(
																isTeam2Winner && 'font-bold text-green-600',
															)}
														>
															{match.score2}
														</span>
													</div>
												) : (
													<div className="text-muted-foreground text-sm">
														Risultato non inserito
													</div>
												)}
											</div>
										</div>

										{/* Layout mobile */}
										<div className="md:hidden">
											{/* Squadra 1 */}
											<div className="mb-3 flex items-center justify-between">
												<div className="flex items-center gap-2">
													<Badge
														className={
															colorGroupClasses[match.team1.group.color]
														}
													>
														{match.team1.group.name}
													</Badge>
													<span className="font-medium">
														{isTeam1Winner && '🏆 '}
														{match.team1.name}
													</span>
												</div>
												{match.score1 !== null && (
													<span
														className={cn(
															'font-mono text-lg font-bold tabular-nums',
															isTeam1Winner && 'text-green-600',
														)}
													>
														{match.score1}
													</span>
												)}
											</div>

											{/* VS */}
											<div className="text-muted-foreground mb-3 text-center text-sm">
												vs
											</div>

											{/* Squadra 2 */}
											<div className="mb-3 flex items-center justify-between">
												<div className="flex items-center gap-2">
													<Badge
														className={
															colorGroupClasses[match.team2.group.color]
														}
													>
														{match.team2.group.name}
													</Badge>
													<span className="font-medium">
														{isTeam2Winner && '🏆 '}
														{match.team2.name}
													</span>
												</div>
												{match.score2 !== null && (
													<span
														className={cn(
															'font-mono text-lg font-bold tabular-nums',
															isTeam2Winner && 'text-green-600',
														)}
													>
														{match.score2}
													</span>
												)}
											</div>

											{/* Risultato non inserito per mobile */}
											{match.score1 === null && match.score2 === null && (
												<div className="text-muted-foreground text-center text-sm">
													Risultato non inserito
												</div>
											)}
										</div>
									</div>
								)
							})}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
