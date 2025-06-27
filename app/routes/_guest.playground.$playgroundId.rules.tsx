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
		<div className="h-screen p-4">
			<Header
				title="Regolamento"
				backLink={`/playground/${params.playgroundId}/menu`}
				icon={<BookOpenText />}
			/>
			<div className="flex h-[calc(100%-60px)] flex-col justify-between md:h-1/2">
				<div className="space-y-2 pt-4">
					<p>Il regolamento è fondamentale per poter partecipare al torneo.</p>
					<p>
						È importante comprendere il contesto e il luogo in cui si gioca, per
						poter giocare in maniera corretta e rispettosa.
					</p>
					<p>
						Leggere il regolamento aiuta a capire le regole e le procedure da
						seguire, per evitare di commettere errori che possono portare a
						penalizzazioni o esclusioni dal torneo.
					</p>
				</div>

				<div className="flex flex-col items-center justify-center">
					<Link to="/regolamento.docx" target="_blank" rel="noreferrer">
						<Button>
							<BookOpenText />
							Scarica/Apri regolamento
						</Button>
					</Link>
				</div>
			</div>
		</div>
	)
}
