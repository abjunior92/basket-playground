import { Form, useNavigation } from '@remix-run/react'
import { Ambulance, Minus, Plus, Settings } from 'lucide-react'
import { type EditMatchPlayerForCard } from './types'
import { Button } from '~/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

type MatchPlayerOptionsMenuProps = {
	player: EditMatchPlayerForCard
	matchId: string
	onOpenAliasDialog: () => void
}

export function MatchPlayerOptionsMenu({
	player,
	matchId,
	onOpenAliasDialog,
}: MatchPlayerOptionsMenuProps) {
	const navigation = useNavigation()
	const isBusy =
		navigation.state === 'submitting' || navigation.state === 'loading'

	const baseAction = (path: string) =>
		`/data/players/${player.id}/${player.teamId}/${player.playgroundId}/${path}?matchId=${matchId}`

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					type="button"
					aria-label="Opzioni"
					className="w-full border-slate-200 bg-white/90 text-slate-700 shadow-sm"
				>
					<Settings className="h-4 w-4 shrink-0" />
					<span className="ml-2">Opzioni</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem>
					<Form
						method="post"
						action={baseAction('retire')}
						preventScrollReset
						className="w-full"
					>
						<Button
							variant={player.retired ? 'outline' : 'destructive'}
							type="submit"
							disabled={isBusy}
							aria-label={
								player.retired ? 'Segna come disponibile' : 'Segna come ritirato'
							}
							className="w-full"
						>
							<Ambulance className="h-4 w-4" />
							{player.retired ? 'Segna come disponibile' : 'Segna come ritirato'}
						</Button>
					</Form>
				</DropdownMenuItem>
				{player.warnings < 2 && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<Form
								method="post"
								action={baseAction('add-warning')}
								preventScrollReset
								className="w-full"
							>
								<Button
									variant="warning"
									type="submit"
									aria-label="Aggiungi ammonizione"
									className="w-full"
									disabled={isBusy}
								>
									<Plus className="h-4 w-4" />
									Aggiungi ammonizione
								</Button>
							</Form>
						</DropdownMenuItem>
					</>
				)}
				{player.warnings > 0 && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<Form
								method="post"
								action={baseAction('remove-warning')}
								preventScrollReset
								className="w-full"
							>
								<Button
									variant="secondary"
									type="submit"
									aria-label="Rimuovi ammonizione"
									className="w-full"
									disabled={isBusy}
								>
									<Minus className="h-4 w-4" />
									Rimuovi ammonizione
								</Button>
							</Form>
						</DropdownMenuItem>
					</>
				)}
				{!player.isExpelled && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<Form
								method="post"
								action={baseAction('add-expulsion')}
								preventScrollReset
								className="w-full"
							>
								<Button
									variant="destructive"
									type="submit"
									aria-label="Espelli giocatore"
									className="w-full"
									disabled={isBusy}
								>
									<Plus className="h-4 w-4" />
									Espelli giocatore
								</Button>
							</Form>
						</DropdownMenuItem>
					</>
				)}
				{player.isExpelled && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<Form
								method="post"
								action={baseAction('remove-expulsion')}
								preventScrollReset
								className="w-full"
							>
								<Button
									variant="secondary"
									type="submit"
									aria-label="Rimuovi espulsione"
									className="w-full"
									disabled={isBusy}
								>
									<Minus className="h-4 w-4" />
									Rimuovi espulsione
								</Button>
							</Form>
						</DropdownMenuItem>
					</>
				)}
				<DropdownMenuItem onSelect={onOpenAliasDialog}>
					<Button variant="outline" className="w-full">
						Modifica Alias Temporaneo
					</Button>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
