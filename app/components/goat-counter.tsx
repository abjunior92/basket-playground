import { useLocation } from '@remix-run/react'
import { useEffect, useRef } from 'react'

type GoatCounterProps = {
	endpoint: string
	allowLocal?: boolean
}

function trackPageView(path: string) {
	const send = () => {
		window.goatcounter?.count({ path })
		return Boolean(window.goatcounter?.count)
	}

	if (send()) return

	const intervalId = window.setInterval(() => {
		if (send()) window.clearInterval(intervalId)
	}, 100)
}

export function GoatCounter({
	endpoint,
	allowLocal = false,
}: GoatCounterProps) {
	const location = useLocation()
	const scriptLoaded = useRef(false)

	useEffect(() => {
		if (scriptLoaded.current) return
		scriptLoaded.current = true

		const script = document.createElement('script')
		script.async = true
		script.src = 'https://gc.zgo.at/count.js'
		script.dataset.goatcounter = endpoint
		script.dataset.goatcounterSettings = JSON.stringify({
			no_onload: true,
			...(allowLocal ? { allow_local: true } : {}),
		})
		document.body.appendChild(script)

		return () => {
			script.remove()
			scriptLoaded.current = false
		}
	}, [endpoint, allowLocal])

	useEffect(() => {
		const path = location.pathname + location.search + location.hash
		trackPageView(path)
	}, [location])

	return null
}
