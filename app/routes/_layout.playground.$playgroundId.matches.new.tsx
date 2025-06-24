import { PrismaClient } from '@prisma/client'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	json,
	redirect,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData, useParams } from '@remix-run/react'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import invariant from 'tiny-invariant'
import ErrorMessage from '~/components/ErrorMessage'
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
import { colorGroupClasses } from '~/lib/types'
import { cn, getDayLabel, getTimeSlots } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Nuova Partita' },
		{ name: 'description', content: 'Nuova Partita' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const groups = await prisma.group.findMany({
		where: { playgroundId: params.playgroundId },
		include: {
			teams: true,
		},
	})

	const matches = await prisma.match.findMany({
		where: { playgroundId: params.playgroundId },
		include: {
			team1: {
				include: {
					group: true,
				},
			},
			team2: {
				include: {
					group: true,
				},
			},
		},
		orderBy: [{ timeSlot: 'asc' }],
	})

	// Raggruppiamo le partite per giorno
	const matchesByDay = matches.reduce(
		(acc, match) => {
			acc[match.day] = acc[match.day] || []
			acc[match.day]?.push(match)
			return acc
		},
		{} as Record<number, typeof matches>,
	)

	return { groups, matchesByDay }
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

	// Controllo se la squadra gioca già in quello slot
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

	return redirect(`/playground/${params.playgroundId}/matches`)
}

export default function NewMatch() {
	const { groups, matchesByDay } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const params = useParams()
	const [selectedDay, setSelectedDay] = useState<string | null>(null)

	const timeSlots = getTimeSlots()
	const selectedDayMatches = selectedDay
		? (matchesByDay[Number(selectedDay)] ?? [])
		: []

	return (
		<div className="md:p-4">
			<Header
				title="Nuova Partita Gironi"
				backLink={`/playground/${params.playgroundId}/matches`}
				icon={<Plus />}
			/>

			<Card className="mx-auto mt-4 max-w-2xl">
				<CardHeader>
					<CardTitle>Aggiungi una partita per la fase a gironi</CardTitle>
				</CardHeader>
				<CardContent>
					<Form method="post" className="space-y-4">
						<div>
							<label htmlFor="day">Giorno:</label>
							<Select
								name="day"
								onValueChange={(value) => setSelectedDay(value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleziona un giorno" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Giorno</SelectLabel>
										{['1', '2', '3', '4'].map((d) => (
											<SelectItem key={d} value={d}>
												{getDayLabel(d)}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						<div>
							<label htmlFor="timeSlot">Orario:</label>
							<Select name="timeSlot">
								<SelectTrigger>
									<SelectValue placeholder="Seleziona un orario" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Orario</SelectLabel>
										{timeSlots.map((slot) => (
											<SelectItem key={slot} value={slot}>
												{slot}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						<div>
							<label htmlFor="field">Campo:</label>
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
							<label htmlFor="team1Id">Squadra 1:</label>
							<Select name="team1Id">
								<SelectTrigger>
									<SelectValue placeholder="Seleziona una squadra" />
								</SelectTrigger>
								<SelectContent>
									{groups.map((g) => (
										<SelectGroup key={g.id}>
											<SelectLabel>{g.name}</SelectLabel>
											{g.teams.map((t) => (
												<SelectItem key={t.id} value={t.id}>
													{t.name}
												</SelectItem>
											))}
										</SelectGroup>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<label htmlFor="team2Id">Squadra 2:</label>
							<Select name="team2Id">
								<SelectTrigger>
									<SelectValue placeholder="Seleziona una squadra avversaria" />
								</SelectTrigger>
								<SelectContent>
									{groups.map((g) => (
										<SelectGroup key={g.id}>
											<SelectLabel>{g.name}</SelectLabel>
											{g.teams.map((t) => (
												<SelectItem key={t.id} value={t.id}>
													{t.name}
												</SelectItem>
											))}
										</SelectGroup>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-center gap-x-2">
							<Button type="submit" className="w-full md:w-auto">
								Aggiungi Partita
							</Button>
							{actionData && 'error' in actionData && (
								<ErrorMessage message={actionData.error} />
							)}
						</div>
					</Form>
				</CardContent>
			</Card>

			{selectedDay && selectedDayMatches.length > 0 ? (
				<Card className="mt-8">
					<CardHeader className="p-3 md:p-6">
						<CardTitle>
							{getDayLabel(selectedDay)} - Partite del giorno
						</CardTitle>
					</CardHeader>
					<CardContent className="p-3 pt-0 md:p-6">
						<div className="space-y-4 overflow-auto">
							{selectedDayMatches
								.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
								.map((match) => (
									<div
										key={match.id}
										className="flex items-center gap-4 border-b pb-4 last:border-b-0"
									>
										<div className="flex flex-col gap-2 md:flex-row">
											<Badge className="w-max shrink-0" variant="outline">
												{match.timeSlot}
											</Badge>
											<Badge className="shrink-0" variant="outline">
												Campo {match.field}
											</Badge>
										</div>
										<div className="flex flex-col md:flex-row md:gap-2">
											<div className="flex items-center gap-2">
												<span>{match.team1.name}</span>
												<Badge
													className={cn(
														colorGroupClasses[match.team1.group.color],
														'text-xs',
													)}
												>
													{match.team1.group.name}
												</Badge>
											</div>
											<span>vs</span>
											<div className="flex items-center gap-2">
												<span>{match.team2.name}</span>
												<Badge
													className={cn(
														colorGroupClasses[match.team2.group.color],
														'text-xs',
													)}
												>
													{match.team2.group.name}
												</Badge>
											</div>
										</div>
									</div>
								))}
						</div>
					</CardContent>
				</Card>
			) : selectedDay ? (
				<Card className="mt-8">
					<CardHeader>
						<CardTitle>
							{getDayLabel(selectedDay)} - Partite del giorno
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Nessuna partita in programma per questo giorno
						</p>
					</CardContent>
				</Card>
			) : null}
		</div>
	)
}
