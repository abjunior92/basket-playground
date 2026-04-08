import { PrismaClient, type Sizes } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
	useParams,
} from '@remix-run/react'
import { ChevronDown, Shirt, Trash } from 'lucide-react'
import React, { useEffect, useState, useMemo } from 'react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '~/components/ui/collapsible'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table'
import { useToast } from '~/hooks/use-toast'
import { playerSizesMap } from '~/lib/types'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Gestione maglie' },
		{ name: 'description', content: 'Gestione maglie' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const jerseys = await prisma.jerseyStock.findMany({
		where: { playgroundId: params.playgroundId },
	})

	const playersBySize = await prisma.player.findMany({
		select: {
			id: true,
			name: true,
			surname: true,
			paid: true,
			size: true,
			team: {
				select: { name: true },
			},
		},
		where: {
			size: { not: null }, // Consideriamo solo i giocatori con una taglia assegnata
			playgroundId: params.playgroundId,
		},
	})

	// Organizziamo i giocatori per taglia
	const playersGrouped = jerseys.reduce(
		(acc, { size }) => {
			acc[size as Sizes] = playersBySize.filter((p) => p.size === size)
			return acc
		},
		{} as Record<
			Sizes,
			{
				id: string
				name: string
				surname: string
				paid: boolean
				team: { name: string }
			}[]
		>,
	)

	return json({ jerseys, playersGrouped })
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')
	const formData = await request.formData()
	const reset = formData.get('_reset') === 'on'

	if (reset) {
		await prisma.$transaction([
			prisma.jerseyStock.updateMany({
				where: { playgroundId: params.playgroundId },
				data: { available: 0, distributed: 0 },
			}),
			prisma.player.updateMany({
				where: { playgroundId: params.playgroundId, size: { not: null } },
				data: { size: null },
			}),
		])
		return json({ ok: true, reset: true })
	}

	const size = formData.get('size') as Sizes
	const availableRaw = formData.get('available')
	const available =
		typeof availableRaw === 'string' ? Number(availableRaw) : NaN

	if (!size || Number.isNaN(available) || available < 0) {
		return json({ error: 'Dati non validi' }, { status: 400 })
	}

	await prisma.jerseyStock.upsert({
		where: { playgroundId_size: { playgroundId: params.playgroundId, size } },
		update: { available },
		create: {
			size,
			available,
			distributed: 0,
			playgroundId: params.playgroundId,
		},
	})

	return json({ ok: true, reset: false })
}

export default function JerseysPage() {
	const { jerseys, playersGrouped } = useLoaderData<typeof loader>()
	const navigation = useNavigation()
	const { toast } = useToast()
	const actionData = useActionData<typeof action>()
	const { playgroundId } = useParams()
	const availableBySize = useMemo(() => {
		return jerseys.reduce(
			(acc, jersey) => {
				acc[jersey.size] = jersey.available
				return acc
			},
			{} as Partial<Record<Sizes, number>>,
		)
	}, [jerseys])

	const [selectedSize, setSelectedSize] = useState<Sizes | undefined>(undefined)
	const [availableInput, setAvailableInput] = useState<string>('')

	const handleSizeChange = (nextValue: string) => {
		const nextSize = nextValue as Sizes
		setSelectedSize(nextSize)

		const existing = availableBySize[nextSize]
		setAvailableInput(existing === undefined ? '' : String(existing))
	}

	useEffect(() => {
		if (actionData === undefined || actionData === null) {
			return
		}

		if ('ok' in actionData) {
			toast(
				actionData.reset
					? {
							title: 'Reset completato',
							description: 'Stock azzerato per tutte le taglie',
							variant: 'default',
						}
					: {
							title: 'Successo',
							description: 'Stock aggiornato con successo',
							variant: 'default',
						},
			)
		}
	}, [actionData, toast])

	return (
		<div className="md:p-4">
			<div className="mb-4 flex items-center justify-between">
				<Header
					title="Gestione maglie"
					backLink={`/playground/${playgroundId}`}
					icon={<Shirt />}
				/>

				<Dialog>
					<DialogTrigger asChild>
						<Button type="button" variant="destructive">
							<Trash className="h-5 w-5" />
							<span className="hidden md:block">Reset stock</span>
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[520px]">
						<DialogHeader>
							<DialogTitle>Reset stock</DialogTitle>
							<DialogDescription>
								Sei sicuro di voler azzerare completamente lo stock di tutte le
								taglie?
								<br />
								Inoltre verranno rimossi tutti i giocatori dalla taglia
								assegnata (perché lo stock risulta 0).
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogClose asChild>
								<Button type="button" variant="secondary">
									Annulla
								</Button>
							</DialogClose>
							<Form method="post">
								<input type="hidden" name="_reset" value="on" />
								<DialogClose>
									<Button type="submit" variant="destructive">
										Conferma reset
									</Button>
								</DialogClose>
							</Form>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			<div className="mt-4 flex flex-col space-y-2">
				<h2 className="text-lg">
					Imposta o modifica uno stock delle maglie disponibili per ogni taglia
				</h2>
				<Form method="post" className="mb-4 flex flex-col gap-2 md:flex-row">
					<Select
						name="size"
						required
						value={selectedSize}
						onValueChange={handleSizeChange}
					>
						<SelectTrigger>
							<SelectValue placeholder="Seleziona la taglia assegnata" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Taglia</SelectLabel>
								{Array.from(playerSizesMap.entries()).map(([key, value]) => (
									<SelectItem key={key} value={key}>
										{value}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					<Input
						type="number"
						name="available"
						placeholder="Stock iniziale"
						inputMode="numeric"
						value={availableInput}
						onChange={(e) => setAvailableInput(e.target.value)}
						min={0}
					/>
					<Button
						type="submit"
						disabled={
							navigation.state === 'submitting' ||
							navigation.state === 'loading'
						}
					>
						Aggiorna
					</Button>
				</Form>
			</div>

			<h2 className="mt-4 text-lg">Lista maglie</h2>
			<div className="mt-4 rounded-lg border border-gray-300">
				<Table className="w-full border-collapse">
					<TableHeader>
						<TableRow className="bg-gray-100">
							<TableHead>Taglia</TableHead>
							<TableHead>Distribuite</TableHead>
							<TableHead>Disponibili</TableHead>
							<TableHead>Stock iniziale</TableHead>
							<TableHead></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{jerseys.map(({ size, distributed, available }) => (
							<Collapsible key={size} asChild>
								<>
									<CollapsibleTrigger asChild>
										<TableRow role="button" className="group text-center">
											<TableCell>{size.toUpperCase()}</TableCell>
											<TableCell>{distributed}</TableCell>
											<TableCell>{available}</TableCell>
											<TableCell>{distributed + available}</TableCell>
											<TableCell>
												<Button variant={'link'} size="icon">
													<ChevronDown className="transition-all duration-300 ease-in-out group-data-[state=open]:rotate-180" />
												</Button>
											</TableCell>
										</TableRow>
									</CollapsibleTrigger>
									<CollapsibleContent asChild>
										<TableRow>
											<TableCell colSpan={5}>
												<div className="rounded-lg bg-gray-100 p-4">
													<h3 className="mb-2 text-sm font-bold">
														Giocatori con questa taglia:
													</h3>
													{playersGrouped[size]?.length > 0 ? (
														<ul className="list-inside list-disc space-y-2 text-sm">
															{playersGrouped[size].map((player) => (
																<li key={player.id}>
																	{player.name} {player.surname} -{' '}
																	{player.paid ? 'Pagato ✅' : 'Non pagato ❌'}{' '}
																	- SQUADRA: {player.team.name}
																</li>
															))}
														</ul>
													) : (
														<p className="text-sm text-gray-500">
															Nessun giocatore con questa taglia.
														</p>
													)}
												</div>
											</TableCell>
										</TableRow>
									</CollapsibleContent>
								</>
							</Collapsible>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
