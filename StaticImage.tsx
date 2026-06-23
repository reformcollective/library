"use client"

import type { PlaceholderValue } from "next/dist/shared/lib/get-img-props"
import type { StaticImageData } from "next/image"

import { styled } from "library/styled"
import Image from "next/image"
import { createContext, type ImgHTMLAttributes, use } from "react"

import { aspectRatioVar, defaultImageClass } from "./StaticImage.css"

export const EagerContext = createContext(false)
export const EagerImages = ({ children }: { children: React.ReactNode }) => (
	<EagerContext.Provider value={true}>{children}</EagerContext.Provider>
)

type LoadingType = "eager" | "lazy" | "default"
export type DefaultImageProps = Omit<
	ImgHTMLAttributes<HTMLImageElement>,
	"src" | "width" | "height" | "loading" | "alt"
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

type BaseStaticImageProps = DefaultImageProps & {
	alt: string
	loading?: LoadingType
}

export type StaticImageProps = BaseStaticImageProps &
	(
		| {
				src: StaticImageData
				width?: number
				height?: number
				sizes?: string
				quality?: number
				priority?: boolean
				placeholder?: PlaceholderValue
				srcSet?: never
		  }
		| {
				src: string
				width: number
				height: number
				quality?: never
				priority?: never
				placeholder?: never
		  }
	)

export default function StaticImage({
	src,
	alt,
	loading,
	sizes,
	quality = 90,
	priority,
	placeholder = "empty",
	...otherProps
}: StaticImageProps) {
	if (!src) return null

	const defaultEager = use(EagerContext)
	const prioritizedLoading = prioritizeLoading(loading, defaultEager)

	const props = {
		alt,
		loading: prioritizedLoading,
		...otherProps,
	}

	if (typeof src === "string") {
		return (
			<DefaultImage
				{...props}
				src={src}
				sizes={sizes}
				aspectRatio={props.width && props.height ? `${props.width}/${props.height}` : ""}
			/>
		)
	}

	const isSVG = src.src.endsWith(".svg") || src.src.startsWith("data:image/svg+xml")
	return (
		<DefaultNextImage
			placeholder={isSVG ? undefined : placeholder}
			{...props}
			src={src}
			quality={quality}
			priority={priority}
			sizes={sizes ?? "100vw"}
			aspectRatio={props.width && props.height ? `${props.width}/${props.height}` : undefined}
		/>
	)
}

export const defaultImageConfig = {
	base: [defaultImageClass],
	tokens: {
		aspectRatio: { token: aspectRatioVar },
	} as const,
}

const DefaultImage = styled("img", defaultImageConfig)
const DefaultNextImage = styled(Image, defaultImageConfig)
