// Every prompt: gives the agent its real context use, from the last reply's tokens in the log.
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const FALLBACK_WINDOW = 200_000

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

// hooks are not given the window size; statusline.sh saves it per session
function savedWindow(sessionId) {
	if (!sessionId) return 0
	const suffix = `-context-${sessionId}`
	const name = fs
		.readdirSync(os.tmpdir())
		.find((file) => file.startsWith("reform-") && file.endsWith(suffix))
	return name
		? Number(fs.readFileSync(path.join(os.tmpdir(), name), "utf8"))
		: 0
}

let raw = ""
process.stdin.on("data", (chunk) => {
	raw += chunk
})
process.stdin.on("end", () => {
	try {
		const input = JSON.parse(raw)
		const usage = input.transcript_path
			? lastUsage(input.transcript_path)
			: null
		if (!usage) return
		const known =
			savedWindow(input.session_id) || Number(process.env.REFORM_CONTEXT_WINDOW)
		const window = known || FALLBACK_WINDOW
		const used =
			(usage.input_tokens ?? 0) +
			(usage.cache_read_input_tokens ?? 0) +
			(usage.cache_creation_input_tokens ?? 0) +
			(usage.output_tokens ?? 0)
		const percent = Math.round((used / window) * 100)
		const note = known ? "" : "; window size not read, assumed"
		console.log(
			`Context: ${percent}% (${used.toLocaleString("en-US")} of ${window.toLocaleString("en-US")} tokens${note})`,
		)
	} catch {
		// a missing or unreadable log means no context line this turn
	}
})
