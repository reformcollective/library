export function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
	const total = Math.floor(seconds)
	const hours = Math.floor(total / 3600)
	const minutes = Math.floor((total % 3600) / 60)
	const secs = total % 60
	const pad = String(secs).padStart(2, "0")
	if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${pad}`
	return `${minutes}:${pad}`
}

export function formatIsoDuration(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "PT0S"
	const total = Math.floor(seconds)
	return `PT${Math.floor(total / 3600)}H${Math.floor((total % 3600) / 60)}M${total % 60}S`
}
