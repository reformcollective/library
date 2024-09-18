import type { IGatsbyImageData } from "gatsby-plugin-image"
import { GatsbyImage } from "gatsby-plugin-image"
import type { ComponentProps } from "react"
import styled from "styled-components"

type DefaultImageProps = ComponentProps<typeof GatsbyImage> &
	ComponentProps<"img">

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
}

export default function UniversalImage({
	image,
	loading = "lazy",
	...props
}: UniversalImageProps) {
	if (!image) {
		console.warn("UniversalImage: image is null or undefined")
		return null
	}

	if (typeof image === "string") return <Image src={image} {...props} />

	if ("file" in image)
		return image.file?.url ? <Image src={image.file.url} {...props} /> : null

	if ("childImageSharp" in image)
		return image.childImageSharp?.gatsbyImageData ? (
			<GatsbyImage image={image.childImageSharp.gatsbyImageData} {...props} />
		) : null

	if ("gatsbyImageData" in image)
		return image.gatsbyImageData ? (
			<GatsbyImage image={image.gatsbyImageData} {...props} />
		) : null

	return <GatsbyImage image={image} {...props} />
}

const Image = styled.img``
