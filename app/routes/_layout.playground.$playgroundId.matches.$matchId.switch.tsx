import { PrismaClient } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
} from '@remix-run/node'
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
	useSearchParams,
} from '@remix-run/react'
import { ArrowLeftRight } from 'lucide-react'
import invariant from 'tiny-invariant'
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
		{ title: 'Switch Partita' },
		{ name: 'description', content: 'Switch Partita' },
	]
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	invariant(params.matchId, 'matchId is required')

	const currentMatch = await prisma.match.findUnique({
		where: { id: params.matchId },
		include: {
			team1: true,
			team2: true,
		},
	})

	if (!currentMatch) {
		throw new Response('Match non trovato', { status: 404 })
	}

	const url = new URL(request.url)
	const selectedDay = Number(url.searchParams.get('day') || currentMatch.day)
	const selectedTimeSlot =
		url.searchParams.get('timeSlot') || currentMatch.timeSlot
	const selectedField = url.searchParams.get('field') || currentMatch.field

	const targetMatch = await prisma.match.findFirst({
		where: {
			playgroundId: params.playgroundId,
			day: selectedDay,
			timeSlot: selectedTimeSlot,
			field: selectedField,
			id: { not: params.matchId },
		},
		include: {
			team1: true,
			team2: true,
		},
	})

	return json({
		currentMatch,
		targetMatch,
		selectedDay,
		selectedTimeSlot,
		selectedField,
	})
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	invariant(params.matchId, 'matchId is required')

	const formData = await request.formData()
	const day = Number(formData.get('day') as string)
	const timeSlot = formData.get('timeSlot') as string
	const field = formData.get('field') as string

	if (!day || !timeSlot || !field) {
		return json({ error: 'Tutti i campi sono obbligatori' }, { status: 400 })
	}

	const currentMatch = await prisma.match.findUnique({
		where: { id: params.matchId },
		select: {
			day: true,
			timeSlot: true,
			field: true,
			score1: true,
			score2: true,
		},
	})

	if (!currentMatch) {
		return json({ error: 'Partita non trovata' }, { status: 404 })
	}

	if (currentMatch.score1 !== null || currentMatch.score2 !== null) {
		return json(
			{
				error: 'Non è possibile switchare una partita che ha già un risultato',
			},
			{ status: 400 },
		)
	}

	const targetMatch = await prisma.match.findFirst({
		where: {
			playgroundId: params.playgroundId,
			day,
			timeSlot,
			field,
			id: { not: params.matchId },
		},
		select: { id: true, score1: true, score2: true },
	})

	if (!targetMatch) {
		return json(
			{
				error:
					'Nessuna partita trovata nello slot selezionato. Seleziona uno slot con una partita esistente.',
			},
			{ status: 400 },
		)
	}

	if (targetMatch.score1 !== null || targetMatch.score2 !== null) {
		return json(
			{
				error:
					'Non è possibile switchare con una partita che ha già un risultato.',
			},
			{ status: 400 },
		)
	}

	const tempDay = 99
	const tempTimeSlot = `__switch__${Date.now()}_${params.matchId}`
	const tempField = '__switch__'

	await prisma.$transaction(async (tx) => {
		await tx.match.update({
			where: { id: params.matchId },
			data: { day: tempDay, timeSlot: tempTimeSlot, field: tempField },
		})

		await tx.match.update({
			where: { id: targetMatch.id },
			data: {
				day: currentMatch.day,
				timeSlot: currentMatch.timeSlot,
				field: currentMatch.field,
			},
		})

		await tx.match.update({
			where: { id: params.matchId },
			data: { day, timeSlot, field },
		})
	})

	return redirect(`/playground/${params.playgroundId}/matches`)
}

export default function SwitchMatch() {
	const {
		currentMatch,
		targetMatch,
		selectedDay,
		selectedTimeSlot,
		selectedField,
	} = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()
	const [searchParams] = useSearchParams()
	const timeSlots = getTimeSlots()
	const backLink = `/playground/${currentMatch.playgroundId}/matches`
	const canConfirmSwitch = !!targetMatch
	const isSubmitting = navigation.state === 'submitting'

	return (
		<div className="mx-auto flex min-w-lg flex-col justify-center space-y-4 p-4">
			<Header
				title="Switch Partita"
				backLink={backLink}
				icon={<ArrowLeftRight className="h-5 w-5" />}
			/>

			<div className="section-blur">
				<h3 className="text-lg font-semibold">Partita corrente</h3>
				<p className="text-sm text-gray-600">
					{currentMatch.team1.name} vs {currentMatch.team2.name}
				</p>
				<p className="text-sm text-gray-600">
					Giorno {currentMatch.day} - {currentMatch.timeSlot} - Campo{' '}
					{currentMatch.field}
				</p>
			</div>

			<Form method="get" className="section-blur flex flex-col gap-4">
				<h3 className="text-lg font-semibold">
					Seleziona lo slot per lo switch
				</h3>

				<div>
					<label htmlFor="day">Giorno:</label>
					<Select name="day" defaultValue={`${selectedDay}`}>
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
					<Select name="timeSlot" defaultValue={selectedTimeSlot}>
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
					<Select name="field" defaultValue={selectedField}>
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

				<Button type="submit" variant="outline" className="w-full md:w-auto">
					Cerca partita nello slot
				</Button>
			</Form>

			{searchParams.toString() ? (
				<div className="section-blur">
					<h3 className="text-lg font-semibold">Anteprima switch</h3>
					{targetMatch ? (
						<>
							<p className="text-sm text-gray-600">
								Partita trovata: {targetMatch.team1.name} vs{' '}
								{targetMatch.team2.name}
							</p>
							<p className="text-sm text-gray-600">
								Giorno {targetMatch.day} - {targetMatch.timeSlot} - Campo{' '}
								{targetMatch.field}
							</p>
						</>
					) : (
						<p className="text-sm text-red-500">
							Nessuna partita trovata nello slot selezionato.
						</p>
					)}
				</div>
			) : null}

			<Form method="post" className="mt-4">
				<input type="hidden" name="day" value={selectedDay} />
				<input type="hidden" name="timeSlot" value={selectedTimeSlot} />
				<input type="hidden" name="field" value={selectedField} />
				<Button
					type="submit"
					disabled={!canConfirmSwitch || isSubmitting}
					className="w-full md:w-auto"
				>
					{isSubmitting ? 'Switch in corso...' : 'Conferma switch'}
				</Button>
				{actionData && 'error' in actionData ? (
					<p className="mt-2 text-red-500">{actionData.error}</p>
				) : null}
			</Form>
		</div>
	)
}
