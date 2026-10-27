"use client"

import { library } from "library/layers.css"
import SanityImage, { type SanityImageData } from "library/sanity/SanityImage"
import StaticImage from "library/StaticImage"
import { css, f, styled } from "library/styled"
import type { StaticImageData } from "next/image"
import { useState } from "react"
import type { PosterSource } from "./posterUrls"

export interface PosterProps {
	/** Uploaded poster. Wins over `fallback`. */
	uploaded?: SanityImageData<"false"> | StaticImageData
	/** Provider or Mux thumbnail, used when nothing was uploaded. */
	fallback?: PosterSource | null
	/** Eager load with fetchPriority high. */
	priority?: boolean
	/** Eager load with normal priority. */
	eager?: boolean
	/** Lets pointer events through to the player underneath, for provider-owned controls inside an iframe. */
	passive?: boolean
	/** False crossfades the poster out and unmounts it after the transition. */
	visible: boolean
}

function isStaticImage(
	poster: SanityImageData<"false"> | StaticImageData,
): poster is StaticImageData {
	return "src" in poster
}

export function Poster({
	uploaded,
	fallback,
	priority = false,
	eager = false,
	visible,
	passive = false,
}: PosterProps) {
	const [gone, setGone] = useState(false)
	if (visible && gone) setGone(false)
	if (!visible && gone) return null

	const loading = priority || eager ? "eager" : "lazy"
	const fetchPriority = priority ? "high" : undefined
	let image: React.ReactNode = null
	if (uploaded && isStaticImage(uploaded)) {
		image = (
			<StaticImage
				src={uploaded}
				alt=""
				loading={loading}
				fetchPriority={fetchPriority}
				sizes="100vw"
			/>
		)
	} else if (uploaded) {
		image = (
			<SanityImage
				src={uploaded}
				alt=""
				noLqip
				loading={loading}
				fetchPriority={fetchPriority}
			/>
		)
	} else if (fallback) {
		image = (
			<StaticImage
				src={fallback.src}
				alt=""
				width={fallback.width}
				height={fallback.height}
				loading={loading}
				fetchPriority={fetchPriority}
			/>
		)
	}
	if (!image) return null

	const handleTransitionEnd = visible ? undefined : () => setGone(true)

	return (
		<PosterLayer
			aria-hidden
			state={visible ? "shown" : "hidden"}
			interaction={passive ? "passive" : "blocking"}
			onTransitionEnd={handleTransitionEnd}
		>
			{image}
		</PosterLayer>
	)
}

const PosterLayer = styled("div", {
	base: [
		{
			"@layer": {
				[library]: f.unresponsive(css`
					position: absolute;
					inset: 0;
					overflow: clip;
					transition: opacity 0.2s ease-in-out;

					& img {
						position: absolute;
						inset: 0;
						display: block;
						width: 100%;
						height: 100%;
						aspect-ratio: auto;
						object-fit: cover;
						object-position: center;
					}
				`),
			},
		},
	],
	variants: {
		state: {
			shown: [
				f.unresponsive(css`
					opacity: 1;
				`),
			],
			hidden: [
				f.unresponsive(css`
					opacity: 0;
					pointer-events: none;
				`),
			],
		},
		interaction: {
			blocking: [],
			passive: [
				f.unresponsive(css`
					pointer-events: none;
				`),
			],
		},
	},
	defaultVariants: { state: "shown", interaction: "blocking" },
})
