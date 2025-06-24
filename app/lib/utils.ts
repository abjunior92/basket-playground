import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export const getTimeSlots = () => {
	const timeSlots = []
	let hour = 18
	let minute = 0

	while (hour < 22 || (hour === 22 && minute <= 55)) {
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

export const getDayLabel = (day: string) => {
	let label

	switch (day) {
		case '1':
			label = 'Domenica'
			break
		case '2':
			label = 'Lunedì'
			break
		case '3':
			label = 'Martedì'
			break
		case '4':
			label = 'Mercoledì'
			break
		case '5':
			label = 'Giovedì (Play-in)'
			break
		case '6':
			label = 'Venerdì (Recuperi)'
			break
		case '7':
			label = 'Domenica (Finali)'
			break
		default:
			break
	}
	return label
}
