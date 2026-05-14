import { Link, type LinkProps } from '@remix-run/react'
import { cn } from '~/lib/utils'

export type GlowCardLinkProps = LinkProps

/**
 * Card cliccabile con alone arancione in alto a destra (effetto hover).
 * Il contenuto specifico va passato come `children`.
 */
export function GlowCardLink({ className, children, ...linkProps }: GlowCardLinkProps) {
	return (
		<Link
			className={cn(
				'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-linear-to-br from-white/95 to-slate-50/90 p-4 shadow-sm',
				'transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-orange-200/80 motion-safe:hover:shadow-md',
				'focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:outline-none',
				className,
			)}
			{...linkProps}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-400/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 motion-safe:group-hover:scale-110"
			/>
			<div className="relative flex min-h-0 flex-1 flex-col gap-3">{children}</div>
		</Link>
	)
}
