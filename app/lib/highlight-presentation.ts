export type HighlightPresentation = {
	tone: 'fire' | 'balance' | 'star' | 'target'
	icon: 'flame' | 'scale' | 'star' | 'target'
	label: string
}

export const getHighlightPresentation = (
	key: string,
): HighlightPresentation => {
	if (key.includes('biggest-')) {
		return {
			tone: 'fire',
			icon: 'flame',
			label: 'Break decisivo',
		}
	}

	if (key.includes('closest-')) {
		return {
			tone: 'balance',
			icon: 'scale',
			label: 'Finale punto a punto',
		}
	}

	if (key.includes('top-scorer-day-')) {
		return {
			tone: 'star',
			icon: 'star',
			label: 'Prestazione da copertina',
		}
	}

	return {
		tone: 'target',
		icon: 'target',
		label: 'Mano calda',
	}
}
