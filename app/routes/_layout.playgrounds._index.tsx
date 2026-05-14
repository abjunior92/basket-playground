import { PrismaClient } from '@prisma/client'
import {
	type MetaFunction,
	type ActionFunctionArgs,
	json,
} from '@remix-run/node'
import {
	Form,
	Link,
	redirect,
	useActionData,
	useLoaderData,
} from '@remix-run/react'
import { ChevronRight, Pencil } from 'lucide-react'
import ErrorMessage from '~/components/ErrorMessage'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [{ title: 'Tornei' }, { name: 'description', content: 'Tornei' }]
}

export const loader = async () => {
	const playgrounds = await prisma.playground.findMany({
		orderBy: [{ year: 'desc' }, { name: 'asc' }],
	})
	return json({ playgrounds })
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData()
	const intent = formData.get('intent') as string
	const name = formData.get('name') as string
	const year = Number(formData.get('year'))

	if (!name) {
		return json({ error: 'Il nome del torneo è obbligatorio' }, { status: 400 })
	}

	if (!Number.isInteger(year) || year < 2000) {
		return json({ error: "L'anno del torneo non è valido" }, { status: 400 })
	}

	if (intent === 'update-playground') {
		const playgroundId = formData.get('playgroundId') as string
		if (!playgroundId) {
			return json({ error: 'ID torneo mancante' }, { status: 400 })
		}

		const existingPlayground = await prisma.playground.findFirst({
			where: {
				name,
				year,
				NOT: { id: playgroundId },
			},
		})

		if (existingPlayground) {
			return json(
				{ error: 'Esiste già un torneo con lo stesso nome e anno' },
				{ status: 400 },
			)
		}

		await prisma.playground.update({
			where: { id: playgroundId },
			data: { name, year },
		})

		return redirect('/playgrounds')
	}

	const existingPlayground = await prisma.playground.findFirst({
		where: { name, year },
	})

	if (existingPlayground) {
		return json(
			{ error: 'Esiste già un torneo con lo stesso nome e anno' },
			{ status: 400 },
		)
	}

	await prisma.playground.create({
		data: { name, year },
	})

	return redirect('/playgrounds')
}

export default function Playgrounds() {
	const { playgrounds } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	return (
		<div className="mx-auto max-w-5xl space-y-6 p-4 pb-12 md:p-6">
			<Header title="Tornei" backLink="/" />

			<section className="section-blur">
				<p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
					Crea
				</p>
				<h2 className="mt-1 text-lg font-bold text-slate-900">Nuovo torneo</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-700">
					Aggiungi un&apos;edizione del torneo con nome distintivo e anno di
					riferimento.
				</p>
			</section>

			<section className="section-blur space-y-4">
				<Form method="post" className="grid gap-4 sm:grid-cols-2">
					<input type="hidden" name="intent" value="create-playground" />
					<div className="sm:col-span-1">
						<label htmlFor="new-playground-name" className="sr-only">
							Nome torneo
						</label>
						<Input
							id="new-playground-name"
							type="text"
							name="name"
							placeholder="Nome del torneo"
							required
						/>
					</div>
					<div className="sm:col-span-1">
						<label htmlFor="new-playground-year" className="sr-only">
							Anno
						</label>
						<Input
							id="new-playground-year"
							type="number"
							name="year"
							placeholder="Anno (es. 2026)"
							min={2000}
							required
						/>
					</div>
					<div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
						<Button type="submit" className="w-full sm:w-auto">
							Aggiungi torneo
						</Button>
						{actionData?.error && <ErrorMessage message={actionData.error} />}
					</div>
				</Form>
			</section>

			<section className="section-blur">
				<p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
					Elenco
				</p>
				<h2 className="mt-1 text-lg font-bold text-slate-900">Tornei creati</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-700">
					Apri un torneo per gestire gironi e squadre, oppure modifica nome e
					anno senza entrare nel dettaglio.
				</p>
			</section>

			{playgrounds.length === 0 ? (
				<section className="section-blur">
					<p className="text-sm text-slate-700">
						Non è ancora stato creato alcun torneo.
					</p>
				</section>
			) : (
				<ul className="space-y-3">
					{playgrounds.map((playground) => (
						<li key={playground.id}>
							<div
								className={cn(
									'flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-linear-to-br from-white/95 to-slate-50/90 p-4 shadow-sm ring-1 ring-slate-900/5',
									'sm:flex-row sm:items-center sm:justify-between sm:gap-4',
								)}
							>
								<Link
									to={`/playgrounds/${playground.id}`}
									className={cn(
										'group flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 transition-colors',
										'focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:outline-none',
									)}
								>
									<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900/5 text-slate-700 transition-colors group-hover:bg-orange-500/15 group-hover:text-orange-900">
										<ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
									</span>
									<span className="min-w-0">
										<span className="block truncate font-semibold text-slate-900 group-hover:text-orange-900">
											{playground.name}
										</span>
										<span className="mt-0.5 block text-sm text-slate-600">
											Anno {playground.year}
										</span>
									</span>
								</Link>
								<Dialog>
									<DialogTrigger asChild>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="shrink-0 border-slate-200 bg-white/80 shadow-sm"
										>
											<Pencil className="h-4 w-4" />
											<span className="ml-1.5">Modifica</span>
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>Modifica torneo</DialogTitle>
										</DialogHeader>
										<div className="grid gap-4 py-4">
											<Input
												form={`editPlaygroundForm-${playground.id}`}
												type="text"
												name="name"
												defaultValue={playground.name}
												required
											/>
											<Input
												form={`editPlaygroundForm-${playground.id}`}
												type="number"
												name="year"
												defaultValue={playground.year}
												min={2000}
												required
											/>
										</div>
										<DialogFooter>
											<Form
												id={`editPlaygroundForm-${playground.id}`}
												method="post"
											>
												<input
													type="hidden"
													name="intent"
													value="update-playground"
												/>
												<input
													type="hidden"
													name="playgroundId"
													value={playground.id}
												/>
												<DialogClose asChild>
													<Button type="submit">Salva</Button>
												</DialogClose>
											</Form>
										</DialogFooter>
									</DialogContent>
								</Dialog>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
