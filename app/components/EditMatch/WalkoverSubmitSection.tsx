import { useNavigation } from '@remix-run/react'
import { CircleAlert } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'

export function WalkoverSubmitSection() {
	const navigation = useNavigation()
	const isSaving =
		(navigation.state === 'submitting' || navigation.state === 'loading') &&
		navigation.formAction?.includes('edit')

	return (
		<section className="section-blur space-y-4">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
					<Checkbox id="isWalkover" name="isWalkover" className="mt-0.5" />
					<label
						htmlFor="isWalkover"
						className="cursor-pointer text-sm leading-snug text-slate-800"
					>
						<span className="font-semibold">Vittoria a tavolino</span>
						<span className="mt-1 block text-xs font-normal text-slate-600">
							Consente di salvare senza controllo sui punti giocatori; imposta di
							solito il risultato a 10-0.
						</span>
					</label>
				</div>

				<div className="flex items-start gap-1">
					<CircleAlert className="h-4 w-4 shrink-0 text-red-500" />
					<span className="block text-xs font-normal text-slate-600">
						<strong>Prima di salvare:</strong> somma i punti giocatori, inserisci
						il risultato e fai un check con il segnapunti.
					</span>
				</div>

				<Button
					type="submit"
					name="intent"
					value="score"
					className="h-12 w-full shrink-0 text-base font-semibold shadow-md sm:h-11 sm:w-auto sm:min-w-40"
					disabled={isSaving}
				>
					{isSaving ? 'Salvataggio…' : 'Salva risultato'}
				</Button>
			</div>
		</section>
	)
}
