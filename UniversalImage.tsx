import type { IGatsbyImageData } from "gatsby-plugin-image"
import { GatsbyImage } from "gatsby-plugin-image"
import type { ComponentProps } from "react"

type GatsbyImageProps = ComponentProps<typeof GatsbyImage>

export type UniversalImageProps = Omit<GatsbyImageProps, "image"> & {
  image: GatsbyImageProps["image"] | null | undefined
}

export type UniversalImageData = IGatsbyImageData | null | undefined

export default function UniversalImage({
  image,
  ...props
}: UniversalImageProps) {
  if (!image) console.warn("UniversalImage: image is null or undefined")
  return image ? <GatsbyImage image={image} {...props} /> : null
}
