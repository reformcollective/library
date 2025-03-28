import type { StaticImageProps } from "./StaticImage"
import SanityImage, { type SanityImageProps } from "./sanity/SanityImage"

export default SanityImage

type Props = SanityImageProps | StaticImageProps
export type UniversalImageData = Props["src"]
