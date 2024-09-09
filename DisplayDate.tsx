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

	if (replacers) {
		let withReplacers = formatted

		for (const [from, to] of Object.entries(replacers)) {
			withReplacers = withReplacers.replace(from, to)
		}
		return useClientOnly(withReplacers, fallback)
	}

	return useClientOnly(formatted, fallback)
}
