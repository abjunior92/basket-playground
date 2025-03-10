import { PrismaClient } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, Link, redirect, useLoaderData } from '@remix-run/react'
import { CalendarRange } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

const prisma = new PrismaClient()

export const loader = async ({ params }: LoaderFunctionArgs) => {
	const playground = await prisma.playground.findUnique({
		where: { id: params.playgroundId },
		include: { groups: true },
	})

	if (!playground) throw new Response('Not Found', { status: 404 })

	return json({ playground })
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const formData = await request.formData()
	const name = formData.get('name') as string

	if (!name) {
		return json({ error: 'Il nome del girone è obbligatorio' }, { status: 400 })
	}

	await prisma.group.create({
		data: {
			name,
			playgroundId: params.playgroundId,
		},
	})

	return redirect(`/playgrounds/${params.playgroundId}`)
}

export default function PlaygroundDetails() {
	const { playground } = useLoaderData<typeof loader>()

	return (
		<div className="p-4">
			<div className="flex items-center justify-between">
				<Header
					title={playground.name}
					backLink="/playgrounds"
					icon={<CalendarRange />}
				/>
				<Form
					method="post"
					action={`/data/playgrounds/${playground.id}/delete`}
				>
					<Button
						type="submit"
						variant="destructive"
						onClick={() =>
							confirm('Sei sicuro di voler eliminare questo playground?')
						}
					>
						Cancella Playground
					</Button>
				</Form>
			</div>

			<h4 className="mt-4 text-xl">Nuovo Girone</h4>
			<Form method="post" className="mt-2 space-y-4">
				<Input
					type="text"
					name="name"
					placeholder="Inserisci il nome del girone"
				/>
				<Button type="submit">Aggiungi Girone</Button>
			</Form>

			<h2 className="mt-12 text-xl">Lista Gironi</h2>

			<ul className="mt-2">
				{playground.groups.map((group) => (
					<li key={group.id} className="list-inside list-decimal">
						<Link to={`/groups/${group.id}`} className="text-blue-500">
							{group.name}
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}
