import { dataset, projectId } from "@/sanity/lib/api"
import Image, { type StaticImageData } from "next/image"
import type { ImgHTMLAttributes } from "react"
import { SanityImage } from "sanity-image"
import type { SanityImageData } from "./sanity/imageMetadata"
import { styled } from "./styled"

type DefaultImageProps = Omit<
	ImgHTMLAttributes<HTMLImageElement>,
	"src" | "width" | "height"
>

export type UniversalImageData =
	| SanityImageData
	| StaticImageData
	| { default: StaticImageData }
	| string
	| null
	| undefined

export type UniversalImageProps = DefaultImageProps & {
	src: UniversalImageData
	alt: string | undefined
	objectFit?: string
	objectPosition?: string
	width?: number
	height?: number
}

export default function UniversalImage({
	src,
	alt = "",
	objectFit = "cover",
	...otherProps
}: UniversalImageProps) {
	if (!src) return null
	const props = { objectFit, alt, ...otherProps }

	if (typeof src === "string") {
		return <DefaultImage {...props} src={src} />
	}

	const isNextImage = "default" in src || "src" in src

	if (!isNextImage) {
		if (!src.asset) return null
		return (
			<DefaultSanityImage
				{...props}
				preview={src.data?.lqip}
				// @ts-expect-error library type mismatch
				hotspot={src.hotspot}
				// @ts-expect-error library type mismatch
				crop={src.crop}
				id={src.asset?._ref}
				projectId={projectId}
				dataset={dataset}
				queryParams={{
					q: 90,
				}}
			/>
		)
	}

	return <DefaultNextImage placeholder="blur" {...props} src={src} />
}

const defaultStyles = ({
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
})

const DefaultSanityImage = styled(SanityImage, defaultStyles)
const DefaultImage = styled("img", defaultStyles)
const DefaultNextImage = styled(Image, defaultStyles)
