import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import {
	Award,
	CalendarCog,
	ChevronRight,
	Flame,
	Home,
	LayoutList,
	Medal,
	PersonStanding,
	Shirt,
	Swords,
	Trophy,
} from 'lucide-react'
import invariant from 'tiny-invariant'
import { GlowCardLink } from '~/components/GlowCardLink'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { checkUserIsLoggedIn } from '~/utils/helpers'

const prisma = new PrismaClient()

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	const name = data?.playground?.name
	return [
		{ title: name ? `${name} · Pannello torneo` : 'Basket Playgrounds' },
		{
			name: 'description',
			content: name
				? `Area amministrativa del torneo «${name}»: calendario, squadre, classifiche e altre sezioni.`
				: 'Basket Playgrounds',
		},
	]
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	await checkUserIsLoggedIn(request)

	const playground = await prisma.playground.findUnique({
		where: { id: params.playgroundId },
	})

	if (!playground) throw new Response('Not Found', { status: 404 })

	return { playground }
}

export default function Index() {
	const { playground } = useLoaderData<typeof loader>()

	return (
		<div className="flex h-full grow flex-col">
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
				<header className="section-blur">
					<h1 className="mb-2 text-2xl leading-tight font-bold text-slate-900">
						{playground.name}
					</h1>
					<p className="text-sm leading-relaxed text-slate-600">
						Pannello principale del torneo: ogni sezione apre gli strumenti per
						quell&apos;area. Scegli dove vuoi lavorare.
					</p>
				</header>

				<nav aria-label="Sezioni amministrative del torneo">
					<ul className="grid gap-3 sm:grid-cols-2">
						{resources.map(({ href, text, description, icon }) => (
							<li key={href}>
								<GlowCardLink
									to={`/playground/${playground.id}${href}`}
									className="min-h-28"
								>
									<div className="flex items-start justify-between gap-2">
										<div className="flex min-w-0 flex-1 items-start gap-3">
											<span
												className={cn(
													'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900/5 text-slate-800',
													'transition-colors duration-200 group-hover:bg-orange-500/15 group-hover:text-orange-900',
												)}
												aria-hidden
											>
												{icon}
											</span>
											<div className="min-w-0">
												<p className="leading-snug font-semibold text-slate-900">
													{text}
												</p>
												<p className="mt-1.5 text-xs leading-relaxed text-slate-600 md:text-sm">
													{description}
												</p>
											</div>
										</div>
										<ChevronRight
											className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-orange-600"
											aria-hidden
										/>
									</div>
								</GlowCardLink>
							</li>
						))}
					</ul>
				</nav>

				<Button asChild variant="outline" className="self-center">
					<Link to="/">
						<Home className="h-5 w-5" />
						Home
					</Link>
				</Button>
			</div>
		</div>
	)
}

const resources = [
	{
		href: '/matches',
		text: 'Calendario partite',
		description:
			'Gestisci il calendario: crea/modifica/riprogramma le partite, inserisci punteggi per ogni singolo match.',
		icon: <CalendarCog className="h-4 w-4" aria-hidden />,
	},
	{
		href: '/teams-list',
		text: 'Squadre',
		description:
			'Cerca per squadra: da qui puoi entrare con facilità nella scheda squadra per il pannello di gestione.',
		icon: <LayoutList className="h-4 w-4" aria-hidden />,
	},
	{
		href: '/players',
		text: 'Giocatori',
		description:
			'Cerca per giocatore: da qui puoi entrare con facilità nella scheda giocatore per il pannello di gestione.',
		icon: <PersonStanding className="h-4 w-4" aria-hidden />,
	},
	{
		href: '/rankings',
		text: 'Classifiche',
		description:
			'Consulta classifiche, punti e spareggi: la situazione dei gironi e dei criteri di classifica.',
		icon: <Medal className="h-4 w-4" aria-hidden />,
	},
	{
		href: '/highlights',
		text: 'Highlights',
		description:
			'Visualizza i momenti salienti del torneo e condividili sui social network.',
		icon: <Flame className="h-4 w-4" aria-hidden />,
	},
	{
		href: '/playoff',
		text: 'Playoff',
		description:
			'Consulta tabelloni eliminatori dopo la fase a gironi: play-in, playoff e finali.',
		icon: <Trophy className="h-4 w-4" aria-hidden />,
	},
	{
		href: '/three-points-challenge',
		text: '3PT Challenge',
		description:
			'Competizione del tiro da tre punti: iscrizioni, tabellone e aggiornamento dei risultati della challenge.',
		icon: <Swords className="h-4 w-4" aria-hidden />,
	},
	{
		href: '/jerseys',
		text: 'Gestione maglie',
		description:
			'Gestisci lo stock delle divise e le relative taglie: controlla il numero di divise disponibili e assegnale ai giocatori.',
		icon: <Shirt className="h-4 w-4" aria-hidden />,
	},
	{
		href: '/palmares',
		text: 'Palmares',
		description:
			'Salva il palmares della squadra per questa edizione: premi individuali e trofei di squadra assegnati per questa edizione.',
		icon: <Award className="h-4 w-4" aria-hidden />,
	},
]
