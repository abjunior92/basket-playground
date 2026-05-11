import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData, useLocation, useParams } from '@remix-run/react'
import { ChevronRight, Swords } from 'lucide-react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Classifica 3PT Challenge' },
		{ name: 'description', content: 'Classifica 3PT Challenge' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')

	const participants = await prisma.threePointChallengeParticipant.findMany({
		where: { playgroundId: params.playgroundId },
		orderBy: [{ score: 'desc' }, { surname: 'asc' }, { name: 'asc' }],
	})

	return { participants }
}

export default function GuestThreePointChallengeRanking() {
	const { participants } = useLoaderData<typeof loader>()
	const params = useParams()
	const location = useLocation()
	const currentPath = `${location.pathname}${location.search}`

	return (
		<div className="mx-auto max-w-lg space-y-4 p-4">
			<Header
				title="3PT Challenge"
				backLink={`/playground/${params.playgroundId}/menu`}
				icon={<Swords />}
			/>

			<section className="section-blur">
				<div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3">
					<p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
						Iscrizioni aperte per tutti
					</p>
					<p className="mt-1 text-sm text-slate-800">
						Vuoi partecipare alla 3PT Challenge?
						<br />
						Per partecipare rivolgiti allo staff nel punto cassa.
					</p>
				</div>
				<div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
					<p className="text-xs font-semibold tracking-wide text-emerald-800 uppercase">
						3PT Challenge
					</p>
					<p className="mt-1 text-sm text-slate-700">
						Classifica aggiornata dei partecipanti ordinata per punteggio.
					</p>
				</div>

				{participants.length > 0 ? (
					<div className="overflow-hidden rounded-lg border border-slate-200">
						<Table className="w-full border-collapse">
							<TableHeader>
								<TableRow className="bg-slate-100">
									<TableHead className="w-14">#</TableHead>
									<TableHead>Giocatore</TableHead>
									<TableHead>Punteggio</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{participants.map((participant, index) => (
									<TableRow key={participant.id}>
										<TableCell className="text-center font-semibold text-slate-700">
											{index + 1}
										</TableCell>
										<TableCell className="">
											{participant.playerId ? (
												<Link
													to={`/playground/${params.playgroundId}/player/${participant.playerId}?returnTo=${encodeURIComponent(currentPath)}`}
													className="guest-link-pill-bordered w-[stretch] justify-between"
													aria-label={`Apri profilo giocatore ${participant.name} ${participant.surname}`}
												>
													{participant.name} {participant.surname}
													<ChevronRight className="h-3.5 w-3.5 opacity-80" />
												</Link>
											) : (
												<>
													{participant.name} {participant.surname}
												</>
											)}
										</TableCell>
										<TableCell className="text-center font-bold">
											{participant.score}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				) : (
					<p className="text-sm text-slate-700">
						Nessun partecipante presente al momento per la gara dei 3 punti.
					</p>
				)}
			</section>
		</div>
	)
}
