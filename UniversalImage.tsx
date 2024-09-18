import type { IGatsbyImageData } from "gatsby-plugin-image"
import { GatsbyImage } from "gatsby-plugin-image"
import type { ImgHTMLAttributes } from "react"
import styled from "styled-components"

type DefaultImageProps = Omit<
	ImgHTMLAttributes<HTMLImageElement>,
	"placeholder" | "onLoad" | "src" | "srcSet" | "width" | "height"
>

export type UniversalImageData =
	| IGatsbyImageData
	| { childImageSharp: { gatsbyImageData: IGatsbyImageData | null } | null }
	| { gatsbyImageData: IGatsbyImageData | null }
	| { file: { url: string | null } | null }
	| string
	| null
	| undefined

export type UniversalImageProps = Omit<DefaultImageProps, "image" | "src"> & {
	image: UniversalImageData
	alt: string
	objectFit?: string
	objectPosition?: string
}

export default function UniversalImage({
	image,
	loading = "lazy",
	objectFit,
	objectPosition,
	...props
}: UniversalImageProps) {
	if (!image) {
		console.warn("UniversalImage: image is null or undefined")
		return null
	}

	if (typeof image === "string")
		return (
			<Image src={image} {...props} style={{ objectFit, objectPosition }} />
		)

	if ("childImageSharp" in image && image.childImageSharp?.gatsbyImageData)
		return (
			<GatsbyImage
				image={image.childImageSharp.gatsbyImageData}
				{...props}
				objectFit={objectFit}
				objectPosition={objectPosition}
			/>
		)

	if ("gatsbyImageData" in image && image.gatsbyImageData)
		return (
			<GatsbyImage
				image={image.gatsbyImageData}
				{...props}
				objectFit={objectFit}
				objectPosition={objectPosition}
			/>
		)

	if ("file" in image && image.file?.url)
		return (
			<Image
				src={image.file.url}
				{...props}
				style={{ objectFit, objectPosition }}
			/>
		)

	if ("images" in image)
		return (
			<GatsbyImage
				image={image}
				{...props}
				objectFit={objectFit}
				objectPosition={objectPosition}
			/>
		)

	console.warn("UniversalImage: image does not exist")
	return null
}

const Image = styled.img``
