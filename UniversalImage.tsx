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

	if ("childImageSharp" in image && image.childImageSharp?.gatsbyImageData)
		return (
			<GatsbyImage image={image.childImageSharp.gatsbyImageData} {...props} />
		)

	if ("gatsbyImageData" in image && image.gatsbyImageData)
		return <GatsbyImage image={image.gatsbyImageData} {...props} />

	if ("file" in image && image.file?.url)
		return <Image src={image.file.url} {...props} />

	if ("images" in image) return <GatsbyImage image={image} {...props} />

	console.warn("UniversalImage: image does not exist")
	return null
}

const Image = styled.img``
