import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { useLoaderData, useParams } from '@remix-run/react'
import invariant from 'tiny-invariant'
import RankingsAndStats from '~/components/RankingsAndStats'
import { getRankingsData } from '~/lib/rankings'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Classifiche' },
		{ name: 'description', content: 'Classifiche' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	return getRankingsData(prisma, params.playgroundId)
}

export default function Rankings() {
	const rankingsData = useLoaderData<typeof loader>()
	const params = useParams()

	return (
		<RankingsAndStats
			data={rankingsData}
			playgroundId={params.playgroundId ?? ''}
			backLink={`/playground/${params.playgroundId}`}
			containerClassName="md:p-4"
			withLinks={false}
		/>
	)
}
