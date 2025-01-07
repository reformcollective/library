import SanityImage, { type SanityImageProps } from "./sanity/SanityImage"
import type { StaticImageProps } from "./StaticImage"

export default SanityImage

type Props = SanityImageProps | StaticImageProps
export type UniversalImageData = Props["src"]
