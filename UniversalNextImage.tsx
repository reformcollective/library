"use client"

import Image, { type StaticImageData } from "next/image"
import { type ImgHTMLAttributes, createContext, use } from "react"
import { styled } from "./styled"

export const eagerContext = createContext(false)
export const EagerImages = ({ children }: { children: React.ReactNode }) => (
	<eagerContext.Provider value={true}>{children}</eagerContext.Provider>
)

type LoadingType = "eager" | "lazy" | "default"

type DefaultImageProps = Omit<
	ImgHTMLAttributes<HTMLImageElement>,
	"src" | "width" | "height" | "loading"
>

export type UniversalImageData =
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
	loading?: LoadingType
	width?: number
	height?: number
}

// Cleans up the loading props by priority so that defaultEager if present is prioritized, then loading if present, then defaults to lazy if no other conditions are met

const prioritizeLoading = (
	loading: LoadingType | undefined,
	defaultEager: boolean,
): "eager" | "lazy" | undefined => {
	if (defaultEager) return "eager"
	if (loading === "default") return undefined
	if (loading !== undefined) return loading
	return "lazy"
}

export default function UniversalImage({
	src,
	alt = "",
	objectFit = "cover",
	objectPosition = "center",
	loading,
	...otherProps
}: UniversalImageProps) {
	if (!src) return null
	const defaultEager = use(eagerContext)

	const prioritizedLoading = prioritizeLoading(loading, defaultEager)

	const props = {
		objectFit: objectFit,
		objectPosition: objectPosition,
		alt,
		loading: prioritizedLoading,
		...otherProps,
	}

	if (typeof src === "string") {
		return <DefaultImage {...props} src={src} />
	}

	return <DefaultNextImage placeholder="blur" {...props} src={src} />
}

const defaultStyles = ({
	objectFit,
	objectPosition,
}: {
	objectFit: ObjectFit
	objectPosition: string
}) => ({
	display: "block",
	objectFit,
	objectPosition,
	height: "auto",
	width: "100%",
})

const DefaultImage = styled("img", defaultStyles)
const DefaultNextImage = styled(Image, defaultStyles)
