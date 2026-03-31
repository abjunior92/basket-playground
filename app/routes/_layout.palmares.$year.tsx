import { PrismaClient } from '@prisma/client'
import {
	type LoaderFunctionArgs,
	json,
	type MetaFunction,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { Award } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import Palmares from '~/components/Palmares'
import { checkUserIsLoggedIn } from '~/utils/helpers'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [{ title: 'Palmares' }]
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	invariant(params.year, 'year is required')
	await checkUserIsLoggedIn(request)
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
			<Header title={`Palmares ${year}`} backLink="/" icon={<Award />} />
			<Palmares palmares={palmares} />
		</div>
	)
}
