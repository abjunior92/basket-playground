import { PrismaClient } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	redirect,
} from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { Pencil } from 'lucide-react'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

const prisma = new PrismaClient()

export const loader = async ({ params }: LoaderFunctionArgs) => {
	const match = await prisma.match.findUnique({
		where: { id: params.matchId },
		include: { team1: true, team2: true },
	})

	if (!match) {
		throw new Response('Match non trovato', { status: 404 })
	}

	return json({ match })
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	const formData = await request.formData()
	const score1 = Number(formData.get('score1'))
	const score2 = Number(formData.get('score2'))

	await prisma.match.update({
		where: { id: params.matchId },
		data: { score1, score2 },
	})

	return redirect('/matches')
}

export default function EditMatch() {
	const { match } = useLoaderData<typeof loader>()

	return (
		<div className="p-4">
			<Header
				title="Modifica Risultato"
				backLink="/matches"
				icon={<Pencil />}
			/>
			<h4 className="mt-4 flex justify-between text-xl">
				{match.team1.name} <span>vs</span> {match.team2.name}
			</h4>

			<Form method="post" className="mt-4">
				<div className="flex justify-between">
					<label>
						<Input
							type="number"
							name="score1"
							defaultValue={match.score1 ?? 0}
							className="w-24"
							required
						/>
					</label>

					<label>
						<Input
							type="number"
							name="score2"
							defaultValue={match.score2 ?? 0}
							className="w-24"
							required
						/>
					</label>
				</div>

				<Button type="submit" className="mt-8">
					Salva
				</Button>
			</Form>
		</div>
	)
}
