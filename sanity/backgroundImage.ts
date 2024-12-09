import { dataset, projectId } from "@/sanity/lib/api"
import type { SanityImageData } from "./imageMetadata"
import { buildSrcSet } from "sanity-image"
import { css } from "library/styled"

const baseUrl = `https://cdn.sanity.io/images/${projectId}/${dataset}/`

export const sanityImageToBackgroundImage = (
	image: SanityImageData,
	/**
	 * if your image is likely to be displayed larger than the screen,
	 * you can increase this value to improve the quality
	 */
	scaleFactor = 1,
) => {
	if (!image.asset) return ""

	const srcSet = buildSrcSet({
		id: image.asset?._ref,
		baseUrl,
		// @ts-expect-error library type mismatch
		crop: image.crop,
		// @ts-expect-error library type mismatch
		hotspot: image.hotspot,
		queryParams: {
			q: 90,
		},
	})
	const defaultSrc = srcSet[0]?.split(" ")[0]

	const converted = srcSet.flatMap((src) => {
		const [url, size] = src.split(" ")
		return url && size && url !== "" && size !== ""
			? css`
					@media (min-width: ${Number.parseInt(size) / (2 * scaleFactor)}px) {
						background-image: url(${url});
					}
				`
			: []
	})

	return [
		css`
			background-color: ${image.data?.dominantColor || "transparent"};
			background-image: url(${defaultSrc || srcSet[0]?.split(" ")[0]});
		`,
		...converted,
	].join("")
}
