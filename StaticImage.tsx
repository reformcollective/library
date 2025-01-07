"use client"

import { styled } from "library/styled"
import type { StaticImageData } from "next/image"
import Image from "next/image"
import { createContext, use, type ImgHTMLAttributes } from "react"

export const EagerContext = createContext(false)
export const EagerImages = ({ children }: { children: React.ReactNode }) => (
	<EagerContext.Provider value={true}>{children}</EagerContext.Provider>
)

type LoadingType = "eager" | "lazy" | "default"
export type DefaultImageProps = Omit<
	ImgHTMLAttributes<HTMLImageElement>,
	"src" | "width" | "height" | "loading"
>
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
	alt: string | undefined
	objectFit?: "contain" | "cover"
	objectPosition?: string
	loading?: LoadingType
} & (
		| {
				src: StaticImageData | { default: StaticImageData }
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
	alt = "",
	objectFit = "cover",
	objectPosition = "center",
	loading,
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

	return (
		<DefaultNextImage
			placeholder="blur"
			{...props}
			src={src}
			aspectRatio={
				props.width && props.height ? `${props.width}/${props.height}` : ""
			}
		/>
	)
}

export const defaultImageStyles = ({
	objectFit,
	objectPosition,
	aspectRatio,
}: {
	objectFit: "contain" | "cover"
	objectPosition: string
	aspectRatio: string
}) => ({
	display: "block",
	objectFit,
	objectPosition,
	height: "auto",
	width: "100%",
	aspectRatio,
})

const DefaultImage = styled("img", defaultImageStyles)
const DefaultNextImage = styled(Image, defaultImageStyles)
