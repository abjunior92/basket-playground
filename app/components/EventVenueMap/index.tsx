import { MapPin, Navigation } from 'lucide-react'
import {
	eventVenueGoogleMapsEmbedUrl,
	eventVenueGoogleMapsUrl,
	eventVenueName,
} from '~/lib/event-venue-map'

export function EventVenueMap() {
	return (
		<div className="space-y-4">
			<div className="overflow-hidden rounded-xl border border-slate-300/70 bg-white/80 shadow-inner">
				<iframe
					title={`Mappa di ${eventVenueName}`}
					src={eventVenueGoogleMapsEmbedUrl}
					className="h-80 w-full border-0 sm:h-96"
					loading="lazy"
					referrerPolicy="no-referrer-when-downgrade"
					allowFullScreen
				/>
			</div>

			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<p className="flex items-center gap-2 text-sm text-slate-800">
					<MapPin className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
					<a
						href={eventVenueGoogleMapsUrl}
						target="_blank"
						rel="noreferrer"
						className="font-medium underline underline-offset-2"
					>
						{eventVenueName}
					</a>
				</p>
				<a
					href={eventVenueGoogleMapsUrl}
					target="_blank"
					rel="noreferrer"
					className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					<Navigation className="h-4 w-4" aria-hidden />
					Apri in Google Maps
				</a>
			</div>
		</div>
	)
}
