import { Link } from '@remix-run/react'
import { ChevronLeft, Home } from 'lucide-react'
import { Button } from '~/components/ui/button'

const Header = ({
	title,
	backLink,
	icon,
	home,
}: {
	title: string
	backLink: string
	icon?: React.ReactNode
	home?: boolean
}) => {
	return (
		<header className="flex items-center space-x-2">
			{home && (
				<Button asChild variant={'ghost'}>
					<Link
						to={'/'}
						className="flex items-center space-x-2 hover:text-blue-500"
					>
						<Home className="h-5 w-5" />
						<span>Home</span>
					</Link>
				</Button>
			)}
			<Button asChild variant={'ghost'} size={'icon'}>
				<Link to={backLink} className="hover:text-blue-500">
					<ChevronLeft className="h-5 w-5" />
				</Link>
			</Button>
			<div className="flex items-center space-x-2">
				{icon}
				<h1 className="text-2xl font-bold">{title}</h1>
			</div>
		</header>
	)
}

export default Header
