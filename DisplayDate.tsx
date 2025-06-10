"use client"

import { useClientOnly } from "./ClientOnly"

export function DisplayDate({
	date,
	options,
	replacers,
}: {
	date: string | number
	options?: Intl.DateTimeFormatOptions
	replacers?: Record<string, string>
}) {
	const UTCformatter = new Intl.DateTimeFormat("en-US", {
		...options,
		timeZone: "UTC",
	})
	const UTCformatted = UTCformatter.format(new Date(date))

	const formatter = new Intl.DateTimeFormat("en-US", options)
	const formatted = formatter.format(new Date(date))

	const fallback = <>{UTCformatted}</>

	// always call useClientOnly unconditionally, but determine the content based on replacers
	let clientContent = formatted
	if (replacers) {
		for (const [from, to] of Object.entries(replacers)) {
			clientContent = clientContent.replace(from, to)
		}
	}

	return useClientOnly(clientContent, fallback)
}
