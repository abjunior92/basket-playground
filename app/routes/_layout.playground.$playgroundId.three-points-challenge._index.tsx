import { PrismaClient } from '@prisma/client'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import {
	useLoaderData,
	Link,
	useParams,
	Form,
	useActionData,
	useRevalidator,
} from '@remix-run/react'
import { Pencil, Plus, Swords } from 'lucide-react'
import { useEffect, useState } from 'react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { useToast } from '~/hooks/use-toast'

const prisma = new PrismaClient()

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const playgroundId = params.playgroundId
	const participants = await prisma.threePointChallengeParticipant.findMany({
		where: { playgroundId },
		orderBy: { score: 'desc' },
	})

	const totalFee = participants.reduce((acc, p) => acc + p.fee, 0)

	return { participants, totalFee }
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const formData = await request.formData()
	const id = formData.get('id') as string
	const score = parseInt(formData.get('score') as string)

	if (!id || !score) {
		return json(
			{ error: 'Compila tutti i campi correttamente!' },
			{ status: 400 },
		)
	}

	await prisma.threePointChallengeParticipant.update({
		where: { id },
		data: { score },
	})

	return { ok: true }
}

export default function ThreePointChallenge() {
	const { participants, totalFee } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const params = useParams()
	const revalidator = useRevalidator()
	const { toast } = useToast()

	const [open, setOpen] = useState<string | null>(null)

	useEffect(() => {
		if (actionData === undefined || actionData === null) {
			return
		}

		if ('ok' in actionData) {
			setOpen(null)
			revalidator.revalidate()
		}

		if ('error' in actionData) {
			toast({
				title: 'Errore',
				description: actionData.error,
				variant: 'destructive',
			})
		}
	}, [actionData, revalidator, toast])

	return (
		<div className="md:p-4">
			<div className="mb-4 flex items-center justify-between">
				<Header
					title="Gara da 3 punti"
					backLink={`/playground/${params.playgroundId}`}
					icon={<Swords />}
				/>
				<Button asChild>
					<Link
						to={`/playground/${params.playgroundId}/three-points-challenge/new`}
					>
						<Plus className="h-5 w-5" />
						<span className="hidden md:block">Aggiungi Partecipante</span>
					</Link>
				</Button>
			</div>
			<div className="overflow-hidden rounded-lg border border-gray-300">
				<Table className="w-full border-collapse">
					<TableHeader>
						<TableRow className="bg-gray-100">
							<TableHead>Iscritto</TableHead>
							<TableHead>Quota</TableHead>
							<TableHead>Nome</TableHead>
							<TableHead>Punteggio</TableHead>
							<TableHead>Modifica punteggio</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{participants.map((p) => (
							<TableRow key={p.id} className="text-center">
								<TableCell>{p.playerId ? '✅' : '❌'}</TableCell>
								<TableCell>{p.fee}€</TableCell>
								<TableCell>
									{p.name} {p.surname}
								</TableCell>
								<TableCell>{p.score}</TableCell>
								<TableCell>
									<Dialog
										open={open === p.id}
										onOpenChange={() => setOpen(open === p.id ? null : p.id)}
									>
										<DialogTrigger asChild>
											<Button
												variant="outline"
												type="button"
												aria-label="Modifica punteggio"
											>
												<Pencil className="h-4 w-4" />
											</Button>
										</DialogTrigger>
										<DialogContent className="sm:max-w-[425px]">
											<DialogHeader>
												<DialogTitle>Modifica punteggio</DialogTitle>
												<DialogDescription>
													Modifica il punteggio ottenuto nella gara da 3 punti
													da {p.name} {p.surname}
												</DialogDescription>
											</DialogHeader>
											<div className="grid gap-4 py-4">
												<input
													form="editScoreForm"
													type="hidden"
													name="id"
													value={p.id}
												/>
												<Input
													form="editScoreForm"
													type="number"
													name="score"
													defaultValue={p.score}
													placeholder="Inserisci il punteggio"
													inputMode="numeric"
													required
												/>
											</div>
											<DialogFooter>
												<Form id="editScoreForm" method="post">
													<Button type="submit">Salva</Button>
												</Form>
											</DialogFooter>
										</DialogContent>
									</Dialog>
								</TableCell>
							</TableRow>
						))}
						<TableRow className="bg-gray-100">
							<TableCell colSpan={5} className="text-center">
								Totale: <span className="font-bold">{totalFee}€</span>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
