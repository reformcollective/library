"use client"

import type { ImageField } from "library/sanity/assetMetadata"
import type { SanityImageCrop, SanityImageHotspot } from "sanity.types"

import { createImageUrlBuilder } from "@sanity/image-url"
import { setElementVars } from "@vanilla-extract/dynamic"
import { styled } from "library/styled"
import { stegaClean } from "next-sanity"
import { type SyntheticEvent, use, useEffect, useLayoutEffect, useRef, useState } from "react"
import { dataset, projectId } from "sanity/lib/api"

import StaticImage, {
	type DefaultImageProps,
	EagerContext,
	prioritizeLoading,
	type StaticImageProps,
} from "../StaticImage"
import { aspectRatioVar, defaultImageClass } from "../StaticImage.css"
import { useCombinedRefs } from "../useCombinedRefs"
import {
	hotspotObjectPositionVar,
	lqipFilterVar,
	lqipImageRenderingVar,
	lqipObjectFitVar,
	lqipVar,
	sanityImageClass,
} from "./SanityImage.css"

// todo: ImageField and SanityImageData are the same shape?
export type SanityImageData<WithAlt extends "true" | "false"> = {
	asset?: { _ref: string }
	crop?: SanityImageCrop
	hotspot?: SanityImageHotspot
	data: ImageField["data"] | null
	alt?: string
	willHaveAlt?: WithAlt
}

type SanityProps =
	| {
			src: SanityImageData<"false"> | null | undefined
			alt: string
	  }
	| {
			src: SanityImageData<"true"> | null | undefined
			alt?: undefined
	  }

export type SanityImageProps = SanityProps & {
	loading?: "eager" | "lazy" | "default"
	quality?: number
	width?: number
	height?: number
} & Omit<DefaultImageProps, "srcSet">

const urlBuilder = createImageUrlBuilder({ projectId, dataset })

const SRCSET_WIDTHS = [400, 800, 1200, 1600, 2400]

function checkLqipTransparency(lqip: string, onResult: (hasTransparency: boolean) => void): void {
	if (!lqip.startsWith("data:image/png;base64,")) {
		onResult(false)
		return
	}
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
		onResult(false)
	}
	img.src = lqip
}

const isStringProps = (
	props: SanityImageProps | StaticImageProps,
): props is StaticImageProps & { src: string } => typeof props.src === "string"

const isNextProps = (
	props: SanityImageProps | StaticImageProps,
): props is Exclude<StaticImageProps, { src: string }> =>
	!!props.src && !isStringProps(props) && ("default" in props.src || "src" in props.src)

export default function SanityUniversalImage(props: SanityImageProps | StaticImageProps) {
	if (!props.src) return null
	if (isStringProps(props) || isNextProps(props)) {
		return <StaticImage {...props} />
	}
	const sanityProps = props as SanityImageProps
	return <SanityImageCore key={sanityProps.src?.asset?._ref} {...sanityProps} />
}

function SanityImageCore(props: SanityImageProps) {
	const { src, ref, quality = 90, ...rest } = props
	const defaultEager = use(EagerContext)
	const prioritizedLoading = prioritizeLoading(props.loading, defaultEager)
	const srcKey = [
		src?.asset?._ref,
		src?.crop?.left,
		src?.crop?.right,
		src?.crop?.top,
		src?.crop?.bottom,
		quality,
	].join(":")
	const [loadedKey, setLoadedKey] = useState<string | null>(null)
	const loaded = loadedKey === srcKey
	const [hasTransparency, setHasTransparency] = useState(false)
	const imgRef = useRef<HTMLImageElement>(null)
	const combinedRef = useCombinedRefs(ref, imgRef)
	const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
		setLoadedKey(srcKey)
		rest.onLoad?.(event)
	}

	useLayoutEffect(() => {
		if (loaded) return
		const el = imgRef.current
		if (!el) return
		if (el.complete && el.naturalWidth) {
			setLoadedKey(srcKey)
		}
	}, [loaded, srcKey])

	useEffect(() => {
		const lqip = src?.data?.lqip
		setHasTransparency(false)
		if (!lqip) return
		let active = true
		checkLqipTransparency(lqip, (result) => {
			if (active) setHasTransparency(result)
		})
		return () => {
			active = false
		}
	}, [src?.data?.lqip])

	const hotspotX = src?.hotspot?.x
	const hotspotY = src?.hotspot?.y
	const cropLeft = src?.crop?.left
	const cropRight = src?.crop?.right
	const cropTop = src?.crop?.top
	const cropBottom = src?.crop?.bottom
	const hasHotspot = hotspotX != null && hotspotY != null
	const shouldTrackRenderedFit = hasHotspot || (!loaded && !!src?.data?.lqip)
	useLayoutEffect(() => {
		if (!shouldTrackRenderedFit) return
		const el = imgRef.current
		if (!el) return
		let rafId: number | null = null
		const scheduleCompute = () => {
			if (rafId != null) return
			rafId = requestAnimationFrame(compute)
		}

		const compute = () => {
			rafId = null
			const { objectFit: fit } = getComputedStyle(el)
			setElementVars(el, { [lqipObjectFitVar]: fit || "cover" })
			if (!hasHotspot || fit !== "cover") {
				setElementVars(el, { [hotspotObjectPositionVar]: "center" })
				return
			}
			const l = cropLeft ?? 0
			const r = cropRight ?? 0
			const t = cropTop ?? 0
			const b = cropBottom ?? 0
			const cw = 1 - l - r
			const ch = 1 - t - b
			const hx = Math.max(0, Math.min(1, cw > 0 ? (hotspotX - l) / cw : 0.5))
			const hy = Math.max(0, Math.min(1, ch > 0 ? (hotspotY - t) / ch : 0.5))
			if (!el.naturalWidth || !el.naturalHeight) return
			const containerW = el.offsetWidth
			const containerH = el.offsetHeight
			if (!containerW || !containerH) return
			const s = Math.max(containerW / el.naturalWidth, containerH / el.naturalHeight)
			const scaledW = el.naturalWidth * s
			const scaledH = el.naturalHeight * s
			const ox = Math.max(containerW - scaledW, Math.min(0, containerW / 2 - scaledW * hx))
			const oy = Math.max(containerH - scaledH, Math.min(0, containerH / 2 - scaledH * hy))
			setElementVars(el, { [hotspotObjectPositionVar]: `${ox}px ${oy}px` })
		}

		const ro = new ResizeObserver(scheduleCompute)
		ro.observe(el)
		window.addEventListener("resize", scheduleCompute)
		el.addEventListener("load", scheduleCompute)
		scheduleCompute()

		return () => {
			if (rafId != null) cancelAnimationFrame(rafId)
			ro.disconnect()
			window.removeEventListener("resize", scheduleCompute)
			el.removeEventListener("load", scheduleCompute)
			setElementVars(el, {
				[hotspotObjectPositionVar]: "center",
				[lqipObjectFitVar]: "cover",
			})
		}
	}, [
		shouldTrackRenderedFit,
		hasHotspot,
		hotspotX,
		hotspotY,
		cropLeft,
		cropRight,
		cropTop,
		cropBottom,
	])

	if (!src?.asset) return null

	const base = urlBuilder
		.image({ _type: "image" as const, asset: src.asset, crop: src.crop })
		.quality(quality)
		.auto("format")
	const imgSrc = base.width(1600).url()
	const srcSet = SRCSET_WIDTHS.map((w) => `${base.width(w).url()} ${w}w`).join(", ")

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
			ref={combinedRef}
			alt={stegaClean(rest.alt ?? src.alt ?? "")}
			loading={prioritizedLoading}
			onLoad={handleLoad}
			src={imgSrc}
			srcSet={srcSet}
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

const DefaultImg = styled("img", {
	base: [defaultImageClass, sanityImageClass],
	tokens: {
		aspectRatio: { token: aspectRatioVar },
		lqip: { token: lqipVar },
		lqipFilter: { token: lqipFilterVar },
		lqipImageRendering: { token: lqipImageRenderingVar },
	},
})
