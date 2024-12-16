"use client"

import { dataset, projectId } from "@/sanity/lib/api"
import Image, { type StaticImageData } from "next/image"
import { type ImgHTMLAttributes, createContext, use } from "react"
import { SanityImage } from "sanity-image"
import type { SanityImageData } from "./sanity/imageMetadata"
import { styled } from "./styled"

export const eagerContext = createContext(false)
export const EagerImages = ({ children }: { children: React.ReactNode }) => (
	<eagerContext.Provider value={true}>{children}</eagerContext.Provider>
)

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

type ObjectFit = "contain" | "cover" | "fill" | "none" | "scale-down"

export type UniversalImageProps = DefaultImageProps & {
	src: UniversalImageData
	alt: string | undefined
	objectFit?: ObjectFit
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
	const defaultEager = use(eagerContext)
	const props = {
		objectFit,
		alt,
		loading: defaultEager ? ("eager" as const) : ("lazy" as const),
		...otherProps,
	}

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
				// if we provide width and height, expand the image to fit
				mode="cover"
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
