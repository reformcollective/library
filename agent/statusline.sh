#!/bin/bash
# Claude Code status line: context used, with the clear warning at 40%.
# Also saves this session's window size for the context hook, which Claude Code does not give it.
input=$(cat)
pct=$(printf '%s' "$input" | node -e '
const fs = require("node:fs"), os = require("node:os"), path = require("node:path")
let s = ""
process.stdin.on("data", (d) => (s += d)).on("end", () => {
	const status = JSON.parse(s)
	const size = status.context_window?.context_window_size
	if (size && status.session_id) {
		const project = path.basename(status.workspace?.project_dir || status.cwd || "project")
		try {
			fs.writeFileSync(path.join(os.tmpdir(), `reform-${project}-context-${status.session_id}`), String(size))
		} catch {}
	}
	const p = status.context_window?.used_percentage
	process.stdout.write(p == null ? "" : String(Math.round(p)))
})')
[ -z "$pct" ] && exit 0
if [ "$pct" -ge 40 ]; then
	printf 'context %s%% | past 40%%: finish the step, commit, write STATE.local.md, clear' "$pct"
else
	printf 'context %s%%' "$pct"
fi
