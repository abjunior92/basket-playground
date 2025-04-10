import { AlertCircle } from 'lucide-react'

const ErrorMessage = ({ message }: { message: string }) => {
	return (
		<div className="flex items-center gap-x-1 rounded-lg bg-red-500 p-1 text-white">
			<AlertCircle className="h-5 w-5" />
			<span>{message}</span>
		</div>
	)
}

export default ErrorMessage
