import type { ImgHTMLAttributes } from "react"
import Image, { type StaticImageData } from "next/image"
import { SanityImage } from "sanity-image"
import type { SanityImageCrop, SanityImageHotspot } from "@/sanity.types"
import { dataset, projectId } from "@/sanity/lib/api"
import { styled } from "./styled"

type DefaultImageProps = Omit<
	ImgHTMLAttributes<HTMLImageElement>,
	"placeholder" | "onLoad" | "src" | "srcSet" | "width" | "height" | "image"
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

export type UniversalImageProps = Omit<DefaultImageProps, "image" | "src"> & {
	src: UniversalImageData
	alt: string
	objectFit?: string
	objectPosition?: string
}

export default function UniversalImage({ src, ...props }: UniversalImageProps) {
	if (!src) return null

	if (typeof src === "string") {
		return <Image src={src} {...props} />
	}

	if ("_type" in src) {
		if (!src.asset) return null
		return (
			<DefaultSanityImage
				hotspot={
					src.hotspot?.x && src.hotspot.y
						? { x: src.hotspot.x, y: src.hotspot.y }
						: undefined
				}
				crop={
					src.crop?.top && src.crop.left && src.crop.bottom && src.crop.right
						? {
								top: src.crop.top,
								left: src.crop.left,
								bottom: src.crop.bottom,
								right: src.crop.right,
							}
						: undefined
				}
				{...props}
				id={src.asset?._ref}
				projectId={projectId}
				dataset={dataset}
			/>
		)
	}

	return <Image src={src} {...props} />
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
