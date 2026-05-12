type DownloadDocument = {
	body: {
		appendChild: (node: HTMLAnchorElement) => unknown
		removeChild: (node: HTMLAnchorElement) => unknown
	}
	createElement: (tagName: 'a') => HTMLAnchorElement
}

type HighlightsImageOptions = {
	backgroundColor: string
	cacheBust: boolean
	pixelRatio: number
}

type HighlightsImageRenderer = (
	node: HTMLElement,
	options: HighlightsImageOptions,
) => Promise<string>

const highlightsImageOptions: HighlightsImageOptions = {
	backgroundColor: '#ffffff',
	cacheBust: true,
	pixelRatio: 2,
}

export const getHighlightsImageFileName = (selectedDay: number | null) => {
	if (!selectedDay) {
		return 'longara-highlights.png'
	}

	return `longara-highlights-giorno-${selectedDay}.png`
}

export const downloadDataUrl = ({
	dataUrl,
	document,
	fileName,
}: {
	dataUrl: string
	document: DownloadDocument
	fileName: string
}) => {
	const link = document.createElement('a')
	link.href = dataUrl
	link.download = fileName
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}

export const createHighlightsImageDataUrl = (
	node: HTMLElement,
	render: HighlightsImageRenderer,
) => render(node, highlightsImageOptions)
