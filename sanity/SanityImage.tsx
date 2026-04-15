"use client"

import { createImageUrlBuilder } from "@sanity/image-url"
import type { AssetMeta } from "library/sanity/assetMetadata"
import { styled } from "library/styled/alpha"
import { stegaClean } from "next-sanity"
import { use, useEffect, useId, useLayoutEffect, useState } from "react"
import { dataset, projectId } from "sanity/lib/api"
import type { SanityImageCrop, SanityImageHotspot } from "sanity.types"
import StaticImage, {
	type DefaultImageProps,
	EagerContext,
	prioritizeLoading,
	type StaticImageProps,
} from "../StaticImage"
import {
	aspectRatioVar,
	defaultImageClass,
	objectFitVar,
	objectPositionVar,
} from "../StaticImage.css"
import {
	lqipClass,
	lqipFilterVar,
	lqipImageRenderingVar,
	lqipVar,
} from "./SanityImage.css"

export type SanityImageData<WithAlt extends "true" | "false"> = {
	asset?: { _ref: string }
	crop?: SanityImageCrop
	hotspot?: SanityImageHotspot
	data?: AssetMeta
	alt?: string
	willHaveAlt?: WithAlt
}

type SanityProps =
	| {
			src: SanityImageData<"false"> | null | undefined
			alt: string | undefined
	  }
	| {
			src: SanityImageData<"true"> | null | undefined
			// the alt should be provided by sanity
			alt?: undefined
	  }

export type SanityImageProps = SanityProps & {
	objectFit?: "contain" | "cover"
	loading?: "eager" | "lazy" | "default"
	width?: number
	height?: number
} & DefaultImageProps

// ─── URL builder ─────────────────────────────────────────────────────────────

const urlBuilder = createImageUrlBuilder({ projectId, dataset })

const SRCSET_WIDTHS = [400, 800, 1200, 1600, 2400]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Checks whether a PNG LQIP data URL contains any actually-transparent pixels
 * by drawing it to an offscreen canvas and sampling the alpha channel.
 * JPEG LQIPs can never be transparent so they are skipped immediately.
 */
function checkLqipTransparency(
	lqip: string,
	onResult: (hasTransparency: boolean) => void,
): void {
	if (!lqip.startsWith("data:image/png;base64,")) return
	const img = new Image()
	img.onload = () => {
		const canvas = document.createElement("canvas")
		canvas.width = img.naturalWidth
		canvas.height = img.naturalHeight
		const ctx = canvas.getContext("2d", { willReadFrequently: true })
		if (!ctx) return
		ctx.drawImage(img, 0, 0)
		const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
		for (let i = 3; i < data.length; i += 4) {
			if ((data[i] ?? 255) < 255) {
				onResult(true)
				return
			}
		}
	}
	img.src = lqip
}

// ─── Type guards ─────────────────────────────────────────────────────────────

const isStringProps = (
	props: SanityImageProps | StaticImageProps,
): props is StaticImageProps & { src: string } => typeof props.src === "string"

const isNextProps = (
	props: SanityImageProps | StaticImageProps,
): props is Exclude<StaticImageProps, { src: string }> =>
	!!props.src &&
	!isStringProps(props) &&
	("default" in props.src || "src" in props.src)

// ─── Component ────────────────────────────────────────────────────────────────

export default function SanityUniversalImage(
	props: SanityImageProps | StaticImageProps,
) {
	if (!props.src) return null
	if (isStringProps(props) || isNextProps(props)) {
		return <StaticImage {...props} />
	}
	return <SanityImageCore {...(props as SanityImageProps)} />
}

function SanityImageCore(props: SanityImageProps) {
	const { src, ...rest } = props
	const defaultEager = use(EagerContext)
	const prioritizedLoading = prioritizeLoading(props.loading, defaultEager)
	const [loaded, setLoaded] = useState(false)
	const [hasTransparency, setHasTransparency] = useState(false)
	const imgId = useId()

	// useLayoutEffect fires synchronously before the browser paints after React
	// commits. Checking el.complete handles already-loaded (cached) images in
	// the same frame — no flash. The load listener handles images that finish
	// loading after mount (including client-side navigation).
	useLayoutEffect(() => {
		if (loaded) return
		const el = document.getElementById(imgId) as HTMLImageElement | null
		if (!el) return
		const clear = () => setLoaded(true)
		if (el.complete) {
			clear()
			return
		}
		el.addEventListener("load", clear, { once: true })
		return () => el.removeEventListener("load", clear)
	}, [imgId, loaded])

	// Async pixel-level transparency check. Runs after paint so it doesn't
	// block the initial render — the LQIP is already visible and the check
	// completes in milliseconds since the image is tiny.
	useEffect(() => {
		const lqip = src?.data?.lqip
		if (!lqip) return
		checkLqipTransparency(lqip, setHasTransparency)
	}, [src?.data?.lqip])

	// Hotspot centering via ResizeObserver. Reads the element's actual rendered
	// dimensions to compute the exact px offset that puts the hotspot at the
	// center of the container — matches Sanity Studio's crop preview behavior.
	// Setting object-position as an inline style overrides the CSS-var-based
	// class rule, so React never clobbers it on re-renders.
	const hotspotX = src?.hotspot?.x
	const hotspotY = src?.hotspot?.y
	const cropLeft = src?.crop?.left
	const cropRight = src?.crop?.right
	const cropTop = src?.crop?.top
	const cropBottom = src?.crop?.bottom
	useLayoutEffect(() => {
		if (hotspotX == null || hotspotY == null) return
		const el = document.getElementById(imgId) as HTMLImageElement | null
		if (!el) return

		// Remap hotspot from original image space into post-crop space
		const l = cropLeft ?? 0
		const r = cropRight ?? 0
		const t = cropTop ?? 0
		const b = cropBottom ?? 0
		const cw = 1 - l - r
		const ch = 1 - t - b
		const hx = Math.max(0, Math.min(1, cw > 0 ? (hotspotX - l) / cw : 0.5))
		const hy = Math.max(0, Math.min(1, ch > 0 ? (hotspotY - t) / ch : 0.5))

		const compute = () => {
			if (!el.naturalWidth || !el.naturalHeight) return
			const containerW = el.offsetWidth
			const containerH = el.offsetHeight
			if (!containerW || !containerH) return
			// Scale factor for object-fit: cover
			const s = Math.max(
				containerW / el.naturalWidth,
				containerH / el.naturalHeight,
			)
			const scaledW = el.naturalWidth * s
			const scaledH = el.naturalHeight * s
			// Offset to center the hotspot, clamped to image bounds
			const ox = Math.max(
				containerW - scaledW,
				Math.min(0, containerW / 2 - scaledW * hx),
			)
			const oy = Math.max(
				containerH - scaledH,
				Math.min(0, containerH / 2 - scaledH * hy),
			)
			el.style.objectPosition = `${ox}px ${oy}px`
		}

		const ro = new ResizeObserver(compute)
		ro.observe(el)
		if (el.complete && el.naturalWidth) compute()
		else el.addEventListener("load", compute, { once: true })

		return () => {
			ro.disconnect()
			el.removeEventListener("load", compute)
			el.style.objectPosition = ""
		}
	}, [imgId, hotspotX, hotspotY, cropLeft, cropRight, cropTop, cropBottom])

	if (!src?.asset) return null

	const base = urlBuilder
		.image({ _type: "image" as const, asset: src.asset, crop: src.crop })
		.quality(90)
		.auto("format")
	const imgSrc = base.width(1600).url()
	const srcSet = SRCSET_WIDTHS.map((w) => `${base.width(w).url()} ${w}w`).join(
		", ",
	)

	// All LQIP props are grouped and cleared together on load. Transparent
	// LQIPs also get pixelated + blur: upscale as hard blocks first, then
	// smooth — cleaner than bilinear and avoids harsh upscaled edges.
	const lqip = !loaded && src.data?.lqip
	const lqipProps = lqip
		? {
				lqip: `url(${lqip})`,
				...(hasTransparency && {
					lqipFilter: "blur(24px)" as const,
					lqipImageRendering: "pixelated" as const,
				}),
			}
		: undefined

	return (
		<DefaultImg
			{...rest}
			id={imgId}
			alt={stegaClean(rest.alt ?? src.alt)}
			loading={prioritizedLoading}
			src={imgSrc}
			srcSet={srcSet}
			objectFit={props.objectFit ?? "cover"}
			aspectRatio={
				props.width && props.height
					? `${props.width}/${props.height}`
					: src.data?.aspectRatio
						? String(src.data.aspectRatio)
						: undefined
			}
			{...lqipProps}
		/>
	)
}

// ─── Styled primitive ────────────────────────────────────────────────────────

const DefaultImg = styled("img", {
	base: [defaultImageClass, lqipClass],
	tokens: {
		objectFit: { token: objectFitVar },
		objectPosition: { token: objectPositionVar },
		aspectRatio: { token: aspectRatioVar },
		lqip: { token: lqipVar },
		lqipFilter: { token: lqipFilterVar },
		lqipImageRendering: { token: lqipImageRenderingVar },
	},
})
