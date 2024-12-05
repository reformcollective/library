import type { SanityImageCrop, SanityImageHotspot } from "@/sanity.types"
import { dataset, projectId } from "@/sanity/lib/api"
import Image, { type StaticImageData } from "next/image"
import { SanityImage } from "sanity-image"
import { styled } from "./styled"
import type { ImgHTMLAttributes } from "react"

type DefaultImageProps = Omit<
	ImgHTMLAttributes<HTMLImageElement>,
	"src" | "width" | "height"
>

export type SanityImageData = {
	asset?: { _ref: string }
	hotspot?: SanityImageHotspot
	crop?: SanityImageCrop
	_type: "image"
}

export type UniversalImageData =
	| SanityImageData
	| StaticImageData
	| string
	| null
	| undefined

export type UniversalImageProps = DefaultImageProps & {
	src: UniversalImageData
	alt: string
	objectFit?: string
	objectPosition?: string
	width?: number
	height?: number
}

export default function UniversalImage({ src, ...props }: UniversalImageProps) {
	if (!src) return null

	if (typeof src === "string") {
		return <Image {...props} src={src} />
	}

	if ("_type" in src) {
		if (!src.asset) return null
		return (
			<DefaultSanityImage
				{...props}
				// @ts-expect-error library type mismatch
				hotspot={src.hotspot}
				// @ts-expect-error library type mismatch
				crop={src.crop}
				id={src.asset?._ref}
				projectId={projectId}
				dataset={dataset}
			/>
		)
	}

	return <Image {...props} src={src} />
}

const DefaultSanityImage = styled(
	SanityImage,
	({
		objectFit,
		objectPosition,
	}: {
		objectFit?: string
		objectPosition?: string
	}) => ({
		objectFit,
		objectPosition,
		height: "auto",
		width: "100%",
	}),
)
