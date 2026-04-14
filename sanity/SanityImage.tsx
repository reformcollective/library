"use client"

import type { AssetMeta } from "library/sanity/assetMetadata"
import { styled } from "library/styled/alpha"
import { stegaClean } from "next-sanity"
import { use } from "react"
import { dataset, projectId } from "sanity/lib/api"
import type { SanityImageCrop, SanityImageHotspot } from "sanity.types"
import { SanityImage } from "sanity-image"
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

const isStringProps = (
	props: SanityImageProps | StaticImageProps,
): props is StaticImageProps & { src: string } => typeof props.src === "string"
const isNextProps = (
	props: SanityImageProps | StaticImageProps,
): props is Exclude<StaticImageProps, { src: string }> =>
	!!props.src &&
	!isStringProps(props) &&
	("default" in props.src || "src" in props.src)

export default function SanityUniversalImage(
	props: SanityImageProps | StaticImageProps,
) {
	if (!props.src) return null
	if (isStringProps(props) || isNextProps(props)) {
		return <StaticImage {...props} />
	}

	const defaultEager = use(EagerContext)
	const prioritizedLoading = prioritizeLoading(props.loading, defaultEager)

	const { src, ...rest } = props
	if (!src.asset) return null

	const hasFixedDimensions = !!(props.width && props.height)

	// When no fixed dimensions are provided, derive object-position from the
	// hotspot focal point so CSS cropping (object-fit: cover) respects the
	// editor's chosen subject. When dimensions are fixed, sanity-image bakes
	// the hotspot into the URL via ?rect= instead.
	const hotspotObjectPosition =
		!hasFixedDimensions && src.hotspot?.x != null && src.hotspot?.y != null
			? `${src.hotspot.x * 100}% ${src.hotspot.y * 100}%`
			: undefined

	return (
		<DefaultSanityImage
			{...rest}
			alt={stegaClean(rest.alt ?? src.alt)}
			loading={prioritizedLoading}
			preview={src.data?.lqip}
			// @ts-expect-error library type mismatch
			hotspot={src.hotspot}
			// @ts-expect-error library type mismatch
			crop={src.crop}
			id={src.asset?._ref}
			mode={props.objectFit ?? "cover"}
			objectFit={props.objectFit ?? "cover"}
			objectPosition={hotspotObjectPosition}
			projectId={projectId}
			dataset={dataset}
			queryParams={{
				q: 90,
			}}
			aspectRatio={
				hasFixedDimensions ? `${props.width}/${props.height}` : undefined
			}
		/>
	)
}

const DefaultSanityImage = styled(SanityImage as typeof SanityImage<"img">, {
	base: [defaultImageClass],
	tokens: {
		objectFit: { token: objectFitVar },
		objectPosition: { token: objectPositionVar },
		aspectRatio: { token: aspectRatioVar },
	},
})
