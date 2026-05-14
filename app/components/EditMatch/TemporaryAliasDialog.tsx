import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'

type TemporaryAliasDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	aliasValue: string
	onAliasChange: (value: string) => void
}

export function TemporaryAliasDialog({
	open,
	onOpenChange,
	aliasValue,
	onAliasChange,
}: TemporaryAliasDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Modifica Alias Temporaneo</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<Input
						type="text"
						placeholder="Alias temporaneo"
						className="border-slate-200 bg-white/90 shadow-inner focus-visible:ring-orange-400/40"
						value={aliasValue}
						onChange={(e) => onAliasChange(e.target.value)}
					/>
					<Button type="button" onClick={() => onOpenChange(false)}>
						Chiudi
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
