import { type Match } from '@prisma/client'
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

export const getFinalTimeSlots = () => {
	return getTimeSlots().filter(
		(slot) =>
			isMatchFinalEight(slot) ||
			isMatchFinalFour(slot) ||
			isMatchSemifinal(slot) ||
			isMatchThirdPlace(slot) ||
			isMatchFinal(slot),
	)
}

export const getMatchLabel = (timeSlot: string) => {
	let label

	switch (timeSlot) {
		case '19:20 > 19:35':
		case '19:40 > 19:55':
		case '20:00 > 20:15':
		case '20:20 > 20:35':
			label = 'Ottavi di Finale'
			break
		case '20:40 > 20:55':
		case '21:00 > 21:15':
			label = 'Quarti di Finale'
			break
		case '21:20 > 21:35':
			label = 'Semifinali'
			break
		case '21:40 > 21:55':
			label = 'Terzo posto'
			break
		case '22:00 > 22:15':
			label = 'Finale'
			break
		default:
			label = 'Extra Partita'
			break
	}
	return label
}

export const isMatchFinalEight = (match: Match | string) => {
	if (typeof match === 'string') {
		match = { timeSlot: match } as Match
	}
	return (
		match.timeSlot === '19:20 > 19:35' ||
		match.timeSlot === '19:40 > 19:55' ||
		match.timeSlot === '20:00 > 20:15' ||
		match.timeSlot === '20:20 > 20:35'
	)
}
export const isMatchFinalFour = (match: Match | string) => {
	if (typeof match === 'string') {
		match = { timeSlot: match } as Match
	}
	return (
		match.timeSlot === '20:40 > 20:55' || match.timeSlot === '21:00 > 21:15'
	)
}

export const isMatchSemifinal = (match: Match | string) => {
	if (typeof match === 'string') {
		match = { timeSlot: match } as Match
	}
	return match.timeSlot === '21:20 > 21:35'
}

export const isMatchThirdPlace = (match: Match | string) => {
	if (typeof match === 'string') {
		match = { timeSlot: match } as Match
	}
	return match.timeSlot === '21:40 > 21:55'
}

export const isMatchFinal = (match: Match | string) => {
	if (typeof match === 'string') {
		match = { timeSlot: match } as Match
	}
	return match.timeSlot === '22:00 > 22:15'
}
