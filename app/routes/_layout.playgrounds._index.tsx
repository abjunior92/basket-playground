import { PrismaClient } from '@prisma/client'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	json,
} from '@remix-run/node'
import {
	Form,
	Link,
	redirect,
	useActionData,
	useLoaderData,
} from '@remix-run/react'
import ErrorMessage from '~/components/ErrorMessage'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [{ title: 'Tornei' }, { name: 'description', content: 'Tornei' }]
}

export const loader = async () => {
	const playgrounds = await prisma.playground.findMany({
		orderBy: [{ year: 'desc' }, { name: 'asc' }],
	})
	return json({ playgrounds })
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData()
	const intent = formData.get('intent') as string
	const name = formData.get('name') as string
	const year = Number(formData.get('year'))

	if (!name) {
		return json({ error: 'Il nome del torneo è obbligatorio' }, { status: 400 })
	}

	if (!Number.isInteger(year) || year < 2000) {
		return json({ error: "L'anno del torneo non è valido" }, { status: 400 })
	}

	if (intent === 'update-playground') {
		const playgroundId = formData.get('playgroundId') as string
		if (!playgroundId) {
			return json({ error: 'ID torneo mancante' }, { status: 400 })
		}

		const existingPlayground = await prisma.playground.findFirst({
			where: {
				name,
				year,
				NOT: { id: playgroundId },
			},
		})

		if (existingPlayground) {
			return json(
				{ error: 'Esiste già un torneo con lo stesso nome e anno' },
				{ status: 400 },
			)
		}

		await prisma.playground.update({
			where: { id: playgroundId },
			data: { name, year },
		})

		return redirect('/playgrounds')
	}

	const existingPlayground = await prisma.playground.findFirst({
		where: { name, year },
	})

	if (existingPlayground) {
		return json(
			{ error: 'Esiste già un torneo con lo stesso nome e anno' },
			{ status: 400 },
		)
	}

	await prisma.playground.create({
		data: { name, year },
	})

	return redirect('/playgrounds')
}

export default function Playgrounds() {
	const { playgrounds } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	return (
		<div className="md:p-4">
			<Header title="Tornei" backLink="/" />

			<h4 className="mt-4 text-xl">Nuovo Torneo</h4>
			<Form method="post" className="mt-2 space-y-4">
				<input type="hidden" name="intent" value="create-playground" />
				<Input
					type="text"
					name="name"
					placeholder="Inserisci il nome del torneo"
					required
				/>
				<Input
					type="number"
					name="year"
					placeholder="Inserisci l'anno del torneo"
					min={2000}
					required
				/>
				<div className="flex items-center gap-x-2">
					<Button type="submit">Aggiungi Torneo</Button>
					{actionData?.error && <ErrorMessage message={actionData.error} />}
				</div>
			</Form>

			<h4 className="mt-12 text-xl">Lista Tornei</h4>
			<ul className="mt-4 space-y-2">
				{playgrounds.map((playground) => (
					<li key={playground.id} className="rounded-md border p-3">
						<div className="flex items-center justify-between gap-2">
							<Link
								to={`/playgrounds/${playground.id}`}
								className="text-blue-500 underline underline-offset-6"
							>
								{playground.name} ({playground.year})
							</Link>
							<Dialog>
								<DialogTrigger asChild>
									<Button type="button" variant="outline" size="sm">
										Modifica
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Modifica torneo</DialogTitle>
									</DialogHeader>
									<div className="grid gap-4 py-4">
										<Input
											form={`editPlaygroundForm-${playground.id}`}
											type="text"
											name="name"
											defaultValue={playground.name}
											required
										/>
										<Input
											form={`editPlaygroundForm-${playground.id}`}
											type="number"
											name="year"
											defaultValue={playground.year}
											min={2000}
											required
										/>
									</div>
									<DialogFooter>
										<Form id={`editPlaygroundForm-${playground.id}`} method="post">
											<input
												type="hidden"
												name="intent"
												value="update-playground"
											/>
											<input
												type="hidden"
												name="playgroundId"
												value={playground.id}
											/>
											<DialogClose asChild>
												<Button type="submit">Salva</Button>
											</DialogClose>
										</Form>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</div>
					</li>
				))}
			</ul>
		</div>
	)
}
