import { type MetaFunction } from '@remix-run/node'
import { Link, useParams } from '@remix-run/react'
import { BookOpenText } from 'lucide-react'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'

export const meta: MetaFunction = () => {
	return [
		{ title: 'Regolamento' },
		{ name: 'description', content: 'Regolamento' },
	]
}

export default function Rules() {
	const params = useParams()

	return (
		<div className="mx-auto max-w-3xl space-y-4 p-4">
			<Header
				title="Regolamento"
				backLink={`/playground/${params.playgroundId}/menu`}
				icon={<BookOpenText />}
			/>

			<section className="section-blur">
				<h2 className="text-lg font-semibold">
					Versione rapida del regolamento
				</h2>
				<p className="mt-2 text-sm text-slate-700">
					Usa questa guida per orientarti in pochi secondi durante il torneo.
					Per ogni dettaglio ufficiale fa sempre fede il documento completo.
				</p>
				<div className="mt-4">
					<Link to="/regolamento.docx" target="_blank" rel="noreferrer">
						<Button>
							<BookOpenText />
							Scarica/Apri regolamento ufficiale
						</Button>
					</Link>
				</div>
			</section>

			<section className="section-blur">
				<h2 className="text-lg font-semibold">Indice rapido</h2>
				<nav className="mt-3 grid gap-2 sm:grid-cols-2">
					{faqSections.map((section) => (
						<a
							key={section.id}
							href={`#${section.id}`}
							className="guest-link-pill-bordered justify-between"
						>
							<span>{section.title}</span>
						</a>
					))}
				</nav>
			</section>

			<div className="space-y-4">
				{faqSections.map((section) => (
					<section
						key={section.id}
						id={section.id}
						className="section-blur scroll-mt-20"
					>
						<h3 className="text-lg font-semibold">{section.title}</h3>
						<ul className="mt-3 space-y-2 text-sm text-slate-700">
							{section.items.map((item) => (
								<li
									key={item}
									className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2"
								>
									{item}
								</li>
							))}
						</ul>
					</section>
				))}
			</div>
		</div>
	)
}

const faqSections = [
	{
		id: 'tempi-e-campo',
		title: 'Tempi e campo',
		items: [
			'La gara dura 15 minuti: vince chi arriva prima a 31 punti oppure chi è avanti allo scadere.',
			'Se dopo 15 minuti c’è parità, si continua senza stop con regola "chi segna vince".',
			'Nell’ultimo minuto il tempo si ferma sempre dopo canestro, palla fuori, fallo e tiri liberi.',
			'Nell’ultimo minuto ogni possesso dura 15 secondi.',
		],
	},
	{
		id: 'punteggio',
		title: 'Punteggio e risultato',
		items: [
			'I canestri valgono 2 o 3 punti in base alla posizione (dentro/fuori arco).',
			'Dopo ogni canestro segnato la palla passa agli avversari con ripresa da fuori arco tramite check ball.',
			'Su recupero difensivo è obbligatorio uscire dall’arco con entrambi i piedi o passare a un compagno fuori arco.',
			'Il check ball si esegue anche su palla fuori o fallo fischiato che non prevede tiri liberi.',
			'Il risultato ufficiale è quello validato dallo staff a fine partita.',
		],
	},
	{
		id: 'falli-arbitraggio-comportamento',
		title: 'Falli, arbitraggio e comportamento',
		items: [
			'I falli su tiro/entrata sono puniti con formula 1+1: segnato il primo libero, viene concesso il secondo.',
			'Dopo ogni libero c’è rimbalzo; se prende la difesa, deve uscire dall’arco dei 3 punti.',
			'Al 6° fallo di squadra scatta il bonus: ogni fallo successivo porta ai liberi (1+1).',
			'Gli arbitri gestiscono integralmente la gara: la decisione arbitrale è sovrana e non contestabile.',
			'Comportamento non idoneo o bestemmia comportano espulsione definitiva dal torneo.',
		],
	},
	{
		id: 'spareggi-e-classifica',
		title: 'Spareggi e criteri classifica',
		items: [
			'Il torneo prevede 5 gironi (alcuni da 7 squadre, altri da 6).',
			'Classifica gironi: percentuale vittorie (vittorie/partite), poi scontri diretti o classifica avulsa, poi differenza canestri totale e canestri segnati.',
			'Confronto tra pari classificate di gironi diversi: percentuale vittorie, poi differenza canestri totale, poi canestri segnati.',
			'La classifica in app segue i dati ufficiali registrati.',
		],
	},
	{
		id: 'playin-playoff-squadre',
		title: 'Playin, playoff, squadre e sostituzioni',
		items: [
			'Accedono direttamente ai playoff: tutte le prime classificate e le 3 migliori seconde.',
			'Ai playin accedono: 2 peggiori seconde, tutte le terze, tutte le quarte e le 4 migliori quinte.',
			'I playin sono partite secche "dentro o fuori" per definire le ultime 8 qualificate ai playoff.',
			'Ogni squadra deve avere da 3 a 5 giocatori.',
			'Durante il torneo è ammesso un 6° giocatore solo come sostituzione definitiva di uno dei 5 iscritti.',
			'Anche in caso di espulsioni la squadra può continuare il torneo se presenti almeno 2 giocatori.',
			'Playin e playoff possono essere disputati solo da giocatori che hanno giocato almeno una partita dei gironi.',
			'Le sostituzioni in partita sono libere ma solo a gioco fermo, avvisando arbitro o segnapunti.',
		],
	},
]
