"use client"

import { styled } from "library/styled/alpha"
import type { PlaceholderValue } from "next/dist/shared/lib/get-img-props"
import type { StaticImageData } from "next/image"
import Image from "next/image"
import { createContext, type ImgHTMLAttributes, use } from "react"
import {
	aspectRatioVar,
	defaultImageClass,
	objectFitVar,
	objectPositionVar,
} from "./StaticImage.css"

export const EagerContext = createContext(false)
export const EagerImages = ({ children }: { children: React.ReactNode }) => (
	<EagerContext.Provider value={true}>{children}</EagerContext.Provider>
)

type LoadingType = "eager" | "lazy" | "default"
export type DefaultImageProps = Omit<
	ImgHTMLAttributes<HTMLImageElement>,
	"src" | "width" | "height" | "loading"
> & { ref?: React.Ref<HTMLImageElement> }
export const prioritizeLoading = (
	loading: LoadingType | undefined,
	defaultEager: boolean,
): "eager" | "lazy" | undefined => {
	if (defaultEager) return "eager"
	if (loading === "default") return undefined
	if (loading !== undefined) return loading
	return "lazy"
}

export type StaticImageProps = DefaultImageProps & {
	alt: string
	objectFit?: "contain" | "cover"
	objectPosition?: string
	loading?: LoadingType
	sizes?: string
	quality?: number
	priority?: boolean
	placeholder?: PlaceholderValue
} & (
		| {
				src: StaticImageData
				width?: number
				height?: number
		  }
		| {
				src: string
				width: number
				height: number
		  }
	)

export default function StaticImage({
	src,
	alt,
	objectFit = "cover",
	objectPosition,
	loading,
	sizes = "100vw",
	quality = 90,
	placeholder = "blur",
	...otherProps
}: StaticImageProps) {
	if (!src) return null

	const defaultEager = use(EagerContext)
	const prioritizedLoading = prioritizeLoading(loading, defaultEager)

	const props = {
		objectFit: objectFit,
		objectPosition: objectPosition,
		alt,
		loading: prioritizedLoading,
		...otherProps,
	}

	if (typeof src === "string") {
		return (
			<DefaultImage
				{...props}
				src={src}
				aspectRatio={
					props.width && props.height ? `${props.width}/${props.height}` : ""
				}
			/>
		)
	}

	const isSVG =
		src.src.endsWith(".svg") || src.src.startsWith("data:image/svg+xml")
	return (
		<DefaultNextImage
			placeholder={isSVG ? undefined : placeholder}
			{...props}
			src={src}
			quality={quality}
			sizes={sizes}
			aspectRatio={
				props.width && props.height
					? `${props.width}/${props.height}`
					: undefined
			}
		/>
	)
}

export const defaultImageConfig = {
	base: [defaultImageClass],
	variables: {
		objectFit: { token: objectFitVar },
		objectPosition: { token: objectPositionVar },
		aspectRatio: { token: aspectRatioVar },
	} as const,
}

const DefaultImage = styled("img", defaultImageConfig)
const DefaultNextImage = styled(Image, defaultImageConfig)
