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
import invariant from 'tiny-invariant'
import ErrorMessage from '~/components/ErrorMessage'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { getDayLabel, getTimeSlots } from '~/lib/utils'

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

	return { groups }
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
	const { groups } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const params = useParams()

	const timeSlots = getTimeSlots()

	return (
		<div className="flex flex-col space-y-4 p-4">
			<Header
				title="Nuova Partita"
				backLink={`/playground/${params.playgroundId}/matches`}
				icon={<Plus />}
			/>

			<Form method="post" className="space-y-4">
				<div>
					<label htmlFor="day">Giorno:</label>
					<Select name="day">
						<SelectTrigger>
							<SelectValue placeholder="Seleziona un giorno" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Giorno</SelectLabel>
								{['1', '2', '3', '4', '5', '6', '7'].map((d) => (
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
		</div>
	)
}
