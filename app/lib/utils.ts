import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export const getTimeSlots = () => {
	const timeSlots = []
	let hour = 18
	let minute = 0

	while (hour < 22 || (hour === 22 && minute <= 35)) {
		const start = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

		// Aggiungi 15 minuti per ottenere l'orario di fine
		minute += 15
		if (minute >= 60) {
			minute = 0
			hour++
		}

		const end = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

		timeSlots.push(`${start} > ${end}`)

		// Aggiungi la pausa di 5 minuti
		minute += 5
		if (minute >= 60) {
			minute = 0
			hour++
		}
	}

	return timeSlots
}
