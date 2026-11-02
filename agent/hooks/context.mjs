// Every prompt: gives the agent the real context use, read from the last reply's token count in the session log.
import fs from "node:fs"

const WINDOW = Number(process.env.REFORM_CONTEXT_WINDOW) || 1_000_000

function lastUsage(file) {
	const lines = fs.readFileSync(file, "utf8").trimEnd().split("\n")
	for (let index = lines.length - 1; index >= 0; index--) {
		let entry
		try {
			entry = JSON.parse(lines[index])
		} catch {
			continue
		}
		const usage = entry.message?.usage
		// an API error leaves a reply with all-zero usage; skip it for the last real one
		const total = usage
			? (usage.input_tokens ?? 0) +
				(usage.cache_read_input_tokens ?? 0) +
				(usage.cache_creation_input_tokens ?? 0)
			: 0
		if (entry.type === "assistant" && !entry.isSidechain && total > 0)
			return usage
	}
	return null
}

let raw = ""
process.stdin.on("data", (chunk) => {
	raw += chunk
})
process.stdin.on("end", () => {
	try {
		const file = JSON.parse(raw).transcript_path
		const usage = file ? lastUsage(file) : null
		if (!usage) return
		const used =
			(usage.input_tokens ?? 0) +
			(usage.cache_read_input_tokens ?? 0) +
			(usage.cache_creation_input_tokens ?? 0) +
			(usage.output_tokens ?? 0)
		const percent = Math.round((used / WINDOW) * 100)
		console.log(
			`Context: ${percent}% (${used.toLocaleString("en-US")} of ${WINDOW.toLocaleString("en-US")} tokens)`,
		)
	} catch {
		// a missing or unreadable log means no context line this turn
	}
})
