import { GatsbyImage } from "gatsby-plugin-image"
import type { ComponentProps } from "react"

type GatsbyImageProps = ComponentProps<typeof GatsbyImage>

export type UniversalImageProps = Omit<GatsbyImageProps, "image"> & {
  image: GatsbyImageProps["image"] | null | undefined
}

export default function UniversalImage({
  image,
  ...props
}: UniversalImageProps) {
  return image ? <GatsbyImage image={image} {...props} /> : null
}
