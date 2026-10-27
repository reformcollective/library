"use client"

import { css, f, styled } from "library/styled"
import { useSyncExternalStore } from "react"
import type { PartProps } from "./types"
import { resolveChildren, usePart } from "./usePart"

function findTrack(media: HTMLElement | null, id: string | null): TextTrack | null {
	const element = media?.firstElementChild
	if (id === null || !element || !("textTracks" in element)) return null
	const list = element.textTracks
	if (!(list instanceof TextTrackList)) return null
	for (const [index, track] of Array.from(list).entries()) {
		if ((track.id || String(index)) === id) return track
	}
	return null
}

function cueText(track: TextTrack | null): string {
	if (!track?.activeCues) return ""
	const lines: string[] = []
	for (const cue of Array.from(track.activeCues)) {
		if ("text" in cue && typeof cue.text === "string") lines.push(cue.text)
	}
	return lines
		.join("\n")
		.replace(/<[^>]*>/g, "")
		.replaceAll("&nbsp;", " ")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&amp;", "&")
}

export function Captions({ label, alwaysShow, children, ...rest }: PartProps<"div">) {
	const { state, media, support, visible } = usePart(["captions"], alwaysShow)
	const activeId = state.activeTextTrack
	const trackCount = state.textTracks.length

	const subscribe = (notify: () => void) => {
		const track = findTrack(media, activeId)
		if (!track) return () => undefined
		track.addEventListener("cuechange", notify)
		return () => track.removeEventListener("cuechange", notify)
	}
	const text = useSyncExternalStore(
		subscribe,
		() => cueText(findTrack(media, activeId)),
		() => "",
	)

	if (!visible || (trackCount === 0 && !alwaysShow)) return null

	return (
		<Cue
			aria-label={label}
			data-active={text !== ""}
			data-state={activeId === null ? "off" : "on"}
			data-support={support}
			{...rest}
		>
			{resolveChildren(children, state, text)}
		</Cue>
	)
}

const Cue = styled(
	"div",
	f.unresponsive(css`
		text-align: center;
		white-space: pre-line;
		pointer-events: none;
	`),
)
