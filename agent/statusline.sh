#!/bin/bash
# Claude Code status line: context used, with the clear warning at 40%.
input=$(cat)
pct=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).context_window?.used_percentage;process.stdout.write(p==null?"":String(Math.round(p)))})')
[ -z "$pct" ] && exit 0
if [ "$pct" -ge 40 ]; then
	printf 'context %s%% | past 40%%: finish the step, commit, write STATE.local.md, clear' "$pct"
else
	printf 'context %s%%' "$pct"
fi
