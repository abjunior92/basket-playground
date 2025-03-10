import { PrismaClient } from '@prisma/client'
import { type ActionFunctionArgs, json } from '@remix-run/node'
import { Form, Link, redirect, useLoaderData } from '@remix-run/react'
import { Home } from 'lucide-react'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

const prisma = new PrismaClient()

export const loader = async () => {
	const playgrounds = await prisma.playground.findMany()
	return json({ playgrounds })
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData()
	const name = formData.get('name') as string

	if (!name) {
		return json(
			{ error: 'Il nome del playground è obbligatorio' },
			{ status: 400 },
		)
	}

	await prisma.playground.create({
		data: { name },
	})

	return redirect('/playgrounds')
}

export default function Playgrounds() {
	const { playgrounds } = useLoaderData<typeof loader>()

	return (
		<div className="p-4">
			<Header title="Tornei" backLink="/" icon={<Home />} />

			<h4 className="mt-4 text-xl">Nuovo Torneo</h4>
			<Form method="post" className="mt-2 space-y-4">
				<Input
					type="text"
					name="name"
					placeholder="Inserisci il nome del torneo"
				/>
				<Button type="submit">Aggiungi Torneo</Button>
			</Form>

			<h4 className="mt-12 text-xl">Lista Tornei</h4>
			<ul className="mt-4">
				{playgrounds.map((playground) => (
					<li key={playground.id} className="mb-2">
						<Link
							to={`/playgrounds/${playground.id}`}
							className="text-blue-500"
						>
							{playground.name}
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}
