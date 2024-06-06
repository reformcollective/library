import type { IGatsbyImageData } from "gatsby-plugin-image"
import { GatsbyImage } from "gatsby-plugin-image"
import type { ComponentProps } from "react"

type GatsbyImageProps = ComponentProps<typeof GatsbyImage>

export type UniversalImageData =
	| IGatsbyImageData
	| { childImageSharp: { gatsbyImageData: IGatsbyImageData | null } | null }
	| null
	| undefined

export type UniversalImageProps = Omit<GatsbyImageProps, "image"> & {
	image: UniversalImageData
}

export default function UniversalImage({
	image,
	...props
}: UniversalImageProps) {
	if (!image) {
		console.warn("UniversalImage: image is null or undefined")
		return null
	}

	const imageToUse =
		"childImageSharp" in image ? image.childImageSharp?.gatsbyImageData : image
	return imageToUse ? (
		<GatsbyImage loading="lazy" image={imageToUse} {...props} />
	) : null
}
