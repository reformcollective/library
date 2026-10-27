"use client"

import { usePreloader } from "library/link/usePreloader"
import { UniversalVideo } from "library/videos/UniversalVideo"
import type { VideoFileSource } from "library/videos/types"
import {
	Children,
	isValidElement,
	type ReactNode,
	type Ref,
	useEffect,
	useRef,
} from "react"
import { useLegacyBridge, warnIgnored } from "./legacy"

interface SourceProps {
	src?: string
	type?: string
	media?: string
}

function collectSources(children: ReactNode) {
	const sources: VideoFileSource[] = []
	for (const child of Children.toArray(children)) {
		if (!isValidElement(child) || child.type !== "source") continue
		const { src, type, media } = child.props as SourceProps
		if (src) sources.push({ src, type, media })
	}
	return sources
}

/**
 * @deprecated Use `UniversalVideo` with a `src` array. Loading waits for the preloader and then follows `loadMargin`.
 */
export function LazyVideo({
	autoPlay,
	loop,
	muted,
	onLoad,
	ref: mediaRef,
	children,
	poster,
	className,
	style,
}: {
	/** Poster image URL. */
	poster?: string
	autoPlay?: boolean
	muted?: boolean
	loop?: boolean
	/** Fires on the first `loadeddata` event. */
	onLoad?: (video: HTMLVideoElement) => void
	/** `<source>` elements. */
	children?: ReactNode
	className?: string
	/** @deprecated Not forwarded, inline styles are not supported. */
	style?: React.CSSProperties
	ref?: Ref<HTMLVideoElement>
}) {
	const { completed } = usePreloader()
	const hasLoaded = useRef(false)
	const { ref } = useLegacyBridge({
		mediaRef,
		listeners: {
			loadeddata: (_event, element) => {
				if (hasLoaded.current) return
				hasLoaded.current = true
				onLoad?.(element)
			},
		},
	})
	useEffect(() => {
		warnIgnored("LazyVideo", style ? ["style"] : [])
	}, [style])

	const sources = collectSources(children)
	if (!completed || sources.length === 0) return <div className={className} />

	return (
		<UniversalVideo
			ref={ref}
			src={sources}
			mode={autoPlay ? "autoplay" : "click"}
			controls={!autoPlay}
			muted={muted || autoPlay}
			loop={loop}
			poster={poster ? { src: poster, width: 1920, height: 1080 } : undefined}
			className={className}
		/>
	)
}
