import { Link } from '@remix-run/react'
import { ChevronLeft } from 'lucide-react'

const Header = ({
	title,
	backLink,
	icon,
}: {
	title: string
	backLink: string
	icon?: React.ReactNode
}) => {
	return (
		<header className="flex items-center space-x-2">
			<Link to={backLink} className="hover:text-blue-500">
				<ChevronLeft className="h-5 w-5" />
			</Link>
			<div className="flex items-center space-x-2">
				{icon}
				<h1 className="text-2xl font-bold">{title}</h1>
			</div>
		</header>
	)
}

export default Header
