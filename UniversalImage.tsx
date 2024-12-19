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

type LoadingType = "eager" | "lazy" | "default"

type DefaultImageProps = Omit<
	ImgHTMLAttributes<HTMLImageElement>,
	"src" | "width" | "height" | "loading"
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
	loading?: LoadingType
	width?: number
	height?: number
	/**
	 * if you need to adjust object positioning or crop manually - for example, if you need the crop to be perfectly centered,
	 * you can use the `contain` to fit the image to the boundaries provided without altering the aspect ratio.
	 *
	 * The default is `cover` which will crop the image to match the requested aspect ratio (based on width and height).
	 */
	sanityMode?: "contain" | "cover"
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
	sanityMode = "cover",
	loading,
	...otherProps
}: UniversalImageProps) {
	if (!src) return null
	const defaultEager = use(eagerContext)

	const prioritizedLoading = prioritizeLoading(loading, defaultEager)

	const props = {
		cssObjectFit: objectFit,
		cssObjectPosition: objectPosition,
		alt,
		loading: prioritizedLoading,
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
				mode={sanityMode}
				projectId={projectId}
				dataset={dataset}
				// htmlWidth={props.width}
				// htmlHeight={props.height}
				queryParams={{
					q: 90,
				}}
			/>
		)
	}

	return (
		<DefaultNextImage
			placeholder="blur"
			{...props}
			src={src}
			// props used by styles are not passed to the img tag, so pass these separately
			objectFit={objectFit}
			objectPosition={objectPosition}
		/>
	)
}

const defaultStyles = ({
	cssObjectFit,
	cssObjectPosition,
}: {
	cssObjectFit?: string
	cssObjectPosition?: string
}) => ({
	display: "block",
	objectFit: cssObjectFit,
	objectPosition: cssObjectPosition,
	height: "auto",
	width: "100%",
})

const DefaultSanityImage = styled(SanityImage, defaultStyles)
const DefaultImage = styled("img", defaultStyles)
const DefaultNextImage = styled(Image, defaultStyles)
