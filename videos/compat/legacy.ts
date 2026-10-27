"use client"

import type { Ref, RefObject } from "react"
import { useCallback, useEffect, useRef } from "react"
import type { UniversalVideoHandle } from "library/videos/types"

export interface LegacyMediaEvent {
	type: string
	currentTarget: HTMLVideoElement
	target: HTMLVideoElement
}

type MediaListener = (event: Event, element: HTMLVideoElement) => void

export interface LegacyListeners {
	loadedmetadata?: MediaListener
	loadeddata?: MediaListener
	playing?: MediaListener
	seeked?: MediaListener
}

const LISTENED_EVENTS = ["loadedmetadata", "loadeddata", "playing", "seeked"] as const

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
	if (typeof ref === "function") ref(value)
	else if (ref) ref.current = value
}

/** Custom elements such as mux-video are not HTMLVideoElement instances, so this checks for the media API instead. */
function isMediaLike(element: Element): element is HTMLVideoElement {
	return "play" in element && "currentTime" in element
}

function asVideoElement(element: Element | null): HTMLVideoElement | null {
	if (!element || !isMediaLike(element)) return null
	return element
}

/**
 * Bridges the old element-based refs and media events to a UniversalVideo handle.
 * `containerRef` receives the root element, `mediaRef` the media element once it exists.
 */
export function useLegacyBridge({
	containerRef,
	mediaRef,
	listeners,
}: {
	containerRef?: Ref<HTMLDivElement>
	mediaRef?: Ref<HTMLVideoElement>
	listeners?: LegacyListeners
}) {
	const handleRef: RefObject<UniversalVideoHandle | null> = useRef(null)
	const listenersRef = useRef<LegacyListeners | undefined>(listeners)
	useEffect(() => {
		listenersRef.current = listeners
	})

	const ref = useCallback(
		(handle: UniversalVideoHandle | null) => {
			handleRef.current = handle
			if (!handle) return
			assignRef(containerRef, handle.container as HTMLDivElement | null)
			let current: HTMLVideoElement | null = null
			const forward = (event: Event) => {
				const listener = listenersRef.current?.[event.type as keyof LegacyListeners]
				if (listener && current) listener(event, current)
			}
			const detach = () => {
				if (!current) return
				for (const name of LISTENED_EVENTS) current.removeEventListener(name, forward)
			}
			const sync = () => {
				const next = asVideoElement(handle.media?.firstElementChild ?? null)
				if (next === current) return
				detach()
				current = next
				assignRef(mediaRef, current)
				if (!current) return
				for (const name of LISTENED_EVENTS) current.addEventListener(name, forward)
			}
			sync()
			const unsubscribe = handle.subscribe(sync)
			return () => {
				unsubscribe()
				detach()
				handleRef.current = null
				assignRef(containerRef, null)
				assignRef(mediaRef, null)
			}
		},
		[containerRef, mediaRef],
	)

	const getVideo = useCallback(
		() => asVideoElement(handleRef.current?.media?.firstElementChild ?? null),
		[],
	)

	const makeEvent = useCallback(
		(type: string): LegacyMediaEvent => {
			const element = getVideo() ?? document.createElement("video")
			return { type, currentTarget: element, target: element }
		},
		[getVideo],
	)

	return { ref, handleRef, getVideo, makeEvent }
}

const warned = new Set<string>()

export function warnIgnored(component: string, props: readonly string[]) {
	if (process.env.NODE_ENV === "production" || props.length === 0) return
	const message = `${component}: ignored props: ${props.join(", ")}`
	if (warned.has(message)) return
	warned.add(message)
	console.warn(message)
}
