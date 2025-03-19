import { PrismaClient, type Sizes } from '@prisma/client'
import { json, type MetaFunction } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { ChevronDown, Shirt } from 'lucide-react'
import Header from '~/components/Header'
import { Button } from '~/components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '~/components/ui/collapsible'
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
import { playerSizesMap } from '~/lib/types'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Gestione maglie' },
		{ name: 'description', content: 'Gestione maglie' },
	]
}

export const loader = async () => {
	const jerseys = await prisma.jerseyStock.findMany()

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

export const action = async ({ request }: { request: Request }) => {
	const formData = await request.formData()
	const size = formData.get('size') as Sizes
	const available = Number(formData.get('available') as string)

	if (!size || !available) {
		return json({ error: 'Dati non validi' }, { status: 400 })
	}

	await prisma.jerseyStock.upsert({
		where: { size },
		update: { available },
		create: { size, available, distributed: 0 },
	})

	return json({ success: true })
}

export default function JerseysPage() {
	const { jerseys, playersGrouped } = useLoaderData<typeof loader>()

	return (
		<div className="p-4">
			<Header title="Gestione maglie" backLink="/" icon={<Shirt />} />

			<div className="mt-4 flex flex-col space-y-2">
				<h2 className="text-lg">
					Imposta uno stock delle maglie disponibili per ogni taglia
				</h2>
				<Form method="post" className="mb-4 flex gap-2">
					<Select name="size" required>
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
						placeholder="Disponibili"
						inputMode="numeric"
					/>
					<Button type="submit">Aggiorna</Button>
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
											<TableCell>
												<Button variant={'link'} size="icon">
													<ChevronDown className="transition-all duration-300 ease-in-out group-data-[state=open]:rotate-180" />
												</Button>
											</TableCell>
										</TableRow>
									</CollapsibleTrigger>
									<CollapsibleContent asChild>
										<TableRow>
											<TableCell colSpan={4}>
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
