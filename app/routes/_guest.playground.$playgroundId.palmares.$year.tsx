import { PrismaClient } from '@prisma/client'
import {
	type LoaderFunctionArgs,
	json,
	type MetaFunction,
} from '@remix-run/node'
import { useLoaderData, useParams } from '@remix-run/react'
import { Award } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import Palmares from '~/components/Palmares'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [{ title: 'Palmares Storico' }]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.year, 'year is required')
	const year = Number(params.year)

	if (!Number.isInteger(year)) {
		throw new Response('Anno non valido', { status: 400 })
	}

	const palmares = await prisma.tournamentPalmares.findUnique({
		where: { year },
	})

	return json({ year, palmares })
}

export default function PalmaresPage() {
	const { year, palmares } = useLoaderData<typeof loader>()
	const { playgroundId } = useParams()

	if (!palmares) {
		return (
			<div className="p-4">
				<h1 className="text-2xl font-bold">Palmares {year}</h1>
				<p className="text-muted-foreground mt-2 text-sm">
					Nessun dato salvato per questa edizione.
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-4 p-4">
			<Header
				title={`Palmares ${year}`}
				backLink={`/playground/${playgroundId}/menu`}
				icon={<Award />}
			/>
			<Palmares palmares={palmares} />
		</div>
	)
}
