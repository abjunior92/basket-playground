import { PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData, useParams } from '@remix-run/react'
import { ExternalLink, LayoutList, Pencil, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import invariant from 'tiny-invariant'
import Header from '~/components/Header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
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
import { colorGroupClasses } from '~/lib/types'
import { cn } from '~/lib/utils'

const prisma = new PrismaClient()

export const meta: MetaFunction = () => {
	return [
		{ title: 'Squadre — gestione' },
		{ name: 'description', content: 'Elenco squadre torneo' },
	]
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
	invariant(params.playgroundId, 'playgroundId is required')

	const playground = await prisma.playground.findUnique({
		where: { id: params.playgroundId },
		select: { id: true, name: true },
	})
	if (!playground) {
		throw new Response('Not Found', { status: 404 })
	}

	const teams = await prisma.team.findMany({
		where: { playgroundId: params.playgroundId },
		include: {
			group: true,
			_count: { select: { players: true } },
		},
		orderBy: [{ group: { name: 'asc' } }, { name: 'asc' }],
	})

	const groups = await prisma.group.findMany({
		where: { playgroundId: params.playgroundId },
		select: { id: true, name: true },
		orderBy: { name: 'asc' },
	})

	return {
		playground,
		groups,
		teams: teams.map((t) => ({
			id: t.id,
			name: t.name,
			groupId: t.groupId,
			groupName: t.group.name,
			groupColor: t.group.color,
			playersCount: t._count.players,
			refPhoneNumber: t.refPhoneNumber,
		})),
	}
}

export default function AdminTeamsIndex() {
	const { playground, groups, teams } = useLoaderData<typeof loader>()
	const params = useParams()
	const playgroundId = params.playgroundId ?? ''
	const backLink = `/playground/${playgroundId}/teams-list`

	const [search, setSearch] = useState('')
	const [groupFilter, setGroupFilter] = useState<string>('all')

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase()
		return teams.filter((t) => {
			if (groupFilter !== 'all' && t.groupId !== groupFilter) return false
			if (!q) return true
			return (
				t.name.toLowerCase().includes(q) ||
				t.groupName.toLowerCase().includes(q) ||
				(t.refPhoneNumber?.toLowerCase().includes(q) ?? false)
			)
		})
	}, [teams, search, groupFilter])

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
			<Header
				title="Squadre"
				backLink={`/playground/${playgroundId}`}
				icon={<LayoutList />}
			/>

			<div className="section-blur text-sm">
				<p className="font-medium text-slate-900">{playground.name}</p>
				<p className="mt-1 text-slate-600">
					{teams.length} squadre registrate · elenco operativo con accesso
					rapido alla scheda squadra (anagrafica, giocatori, modifiche).
				</p>
			</div>

			<section className="section-blur">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div className="relative max-w-md flex-1">
						<Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
						<Input
							type="search"
							placeholder="Filtra per nome squadra, girone o telefono…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="border-slate-300 bg-white pl-9"
							aria-label="Filtra squadre"
						/>
					</div>
					<div className="flex w-full flex-col gap-1 sm:w-56">
						<label
							htmlFor="group-filter"
							className="text-xs font-medium tracking-wide text-slate-600 uppercase"
						>
							Girone
						</label>
						<Select value={groupFilter} onValueChange={setGroupFilter}>
							<SelectTrigger
								id="group-filter"
								className="border-slate-300 bg-white"
							>
								<SelectValue placeholder="Tutti i gironi" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Tutti i gironi</SelectItem>
								{groups.map((g) => (
									<SelectItem key={g.id} value={g.id}>
										{g.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</section>

			<div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-300 bg-white shadow-sm">
				<Table>
					<TableHeader>
						<TableRow className="border-b border-slate-200 bg-slate-100 hover:bg-slate-100">
							<TableHead className="w-[44px] text-xs font-semibold tracking-wide text-slate-600 uppercase">
								#
							</TableHead>
							<TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
								Squadra
							</TableHead>
							<TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
								Girone
							</TableHead>
							<TableHead className="text-right text-xs font-semibold tracking-wide text-slate-600 uppercase">
								Roster
							</TableHead>
							<TableHead className="hidden text-xs font-semibold tracking-wide text-slate-600 uppercase md:table-cell">
								Referente
							</TableHead>
							<TableHead className="w-[120px] text-right text-xs font-semibold tracking-wide text-slate-600 uppercase">
								Azioni
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="py-10 text-center text-sm text-slate-600"
								>
									Nessuna squadra corrisponde ai filtri selezionati.
								</TableCell>
							</TableRow>
						) : (
							filtered.map((team, index) => (
								<TableRow
									key={team.id}
									className={cn(
										'border-b border-slate-100',
										index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60',
									)}
								>
									<TableCell className="align-middle font-mono text-xs text-slate-500">
										{index + 1}
									</TableCell>
									<TableCell className="align-middle font-medium text-slate-900">
										{team.name}
									</TableCell>
									<TableCell className="align-middle">
										<Badge
											variant="outline"
											className={cn(
												'border-0 text-xs font-medium text-white',
												colorGroupClasses[team.groupColor],
											)}
										>
											{team.groupName}
										</Badge>
									</TableCell>
									<TableCell className="text-right align-middle font-mono text-sm text-slate-800 tabular-nums">
										{team.playersCount}
									</TableCell>
									<TableCell className="hidden align-middle text-sm text-slate-700 md:table-cell">
										{team.refPhoneNumber ? (
											<span className="font-mono text-xs">
												{team.refPhoneNumber}
											</span>
										) : (
											<span className="text-slate-400">—</span>
										)}
									</TableCell>
									<TableCell className="text-right align-middle">
										<div className="flex justify-end gap-1">
											<Button
												asChild
												variant="outline"
												size="sm"
												className="h-8 px-2"
											>
												<Link
													to={`/playgrounds/${playgroundId}/teams/${team.id}`}
													state={{ backLink }}
												>
													<Pencil className="h-3.5 w-3.5" />
													<span className="sr-only sm:not-sr-only sm:ml-1 sm:inline">
														Scheda
													</span>
												</Link>
											</Button>
											<Button
												asChild
												variant="ghost"
												size="sm"
												className="h-8 px-2"
											>
												<Link
													to={`/playgrounds/${playgroundId}/groups/${team.groupId}`}
													title="Apri girone"
												>
													<ExternalLink className="h-3.5 w-3.5" />
													<span className="sr-only">Girone</span>
												</Link>
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
