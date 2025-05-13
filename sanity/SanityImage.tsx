"use client"

import type { SanityImageCrop, SanityImageHotspot } from "@/sanity.types"
import type { AssetMeta } from "library/sanity/assetMetadata"
import StaticImage, {
	defaultImageStyles,
	EagerContext,
	prioritizeLoading,
	type DefaultImageProps,
	type StaticImageProps,
} from "../StaticImage"
import { use } from "react"
import { styled } from "library/styled"
import { SanityImage } from "sanity-image"
import { dataset, projectId } from "@/sanity/lib/api"
import { stegaClean } from "next-sanity"

type SanityImageData<CropType, WithAlt extends "true" | "false"> = {
	asset?: { _ref: string }
	crop?: SanityImageCrop
	hotspot?: SanityImageHotspot
	data?: AssetMeta
	alt?: string
	cropType?: CropType
	willHaveAlt?: WithAlt
}

type SanityProps<CropType> =
	| {
			src: SanityImageData<CropType, "false"> | null | undefined
			alt: string | undefined
	  }
	| {
			src: SanityImageData<CropType, "true"> | null | undefined
			// the alt should be provided by sanity
			alt?: undefined
	  }

type Test = SanityProps<"test">

export type SanityImageProps =
	| (SanityProps<"sanity"> & {
			objectFit?: "contain" | "cover"
			objectPosition?: undefined
			loading?: "eager" | "lazy" | "default"
			width: number
			height: number
	  } & DefaultImageProps)
	| (SanityProps<"uncropped"> & {
			objectFit?: undefined
			objectPosition?: undefined
			loading?: "eager" | "lazy" | "default"
			width?: undefined
			height?: undefined
	  } & DefaultImageProps)
	| (SanityProps<"css"> & {
			objectFit?: "contain" | "cover"
			objectPosition?: string
			loading?: "eager" | "lazy" | "default"
			width?: number
			height?: number
	  } & DefaultImageProps)

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
			projectId={projectId}
			dataset={dataset}
			queryParams={{
				q: 90,
			}}
			aspectRatio={
				props.width && props.height
					? `${props.width}/${props.height}`
					: undefined
			}
		/>
	)
}

const DefaultSanityImage = styled(
	// @ts-expect-error - TODO: fix types
	SanityImage,
	defaultImageStyles,
) as unknown as typeof SanityImage
