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
import { Input } from '~/components/ui/input'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [{ title: 'Tornei' }, { name: 'description', content: 'Tornei' }]
}

export const loader = async () => {
	const playgrounds = await prisma.playground.findMany()
	return json({ playgrounds })
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData()
	const name = formData.get('name') as string

	const existingPlayground = await prisma.playground.findFirst({
		where: { name },
	})

	if (existingPlayground) {
		return json({ error: 'Torneo già esistente!' }, { status: 400 })
	}

	if (!name) {
		return json({ error: 'Il nome del torneo è obbligatorio' }, { status: 400 })
	}

	await prisma.playground.create({
		data: { name },
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
				<Input
					type="text"
					name="name"
					placeholder="Inserisci il nome del torneo"
					required
				/>
				<div className="flex items-center gap-x-2">
					<Button type="submit">Aggiungi Torneo</Button>
					{actionData?.error && <ErrorMessage message={actionData.error} />}
				</div>
			</Form>

			<h4 className="mt-12 text-xl">Lista Tornei</h4>
			<ul className="mt-4">
				{playgrounds.map((playground) => (
					<li key={playground.id} className="mb-2 list-inside list-disc">
						<Link
							to={`/playgrounds/${playground.id}`}
							className="text-blue-500 underline underline-offset-6"
						>
							{playground.name}
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}
