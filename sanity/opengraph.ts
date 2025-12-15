import { createImageUrlBuilder } from "@sanity/image-url"
import { dataset, projectId } from "sanity/lib/api"
import type { SanityImageCrop, SanityImageHotspot } from "sanity.types"

export type MainImage = NonNullable<Parameters<typeof urlForImage>[0]>

type URLForImageType =
	| string
	| {
			asset?:
				| {
						_ref: string
						_type: "reference"
						_weak?: boolean | undefined
				  }
				| undefined
			hotspot?: SanityImageHotspot | undefined
			crop?: SanityImageCrop | undefined
			_type: "image"
	  }
	| null

const imageBuilder = createImageUrlBuilder({
	projectId: projectId || "",
	dataset: dataset || "",
})

export const urlForImage = (source: URLForImageType) => {
	// Ensure that source image contains a valid reference
	if (typeof source !== "string" && !source?.asset?._ref) {
		return undefined
	}

	// biome-ignore lint/suspicious/noFocusedTests: false positive
	return imageBuilder?.image(source).auto("format").fit("max")
}

export function resolveOpenGraphImage(
	image: MainImage,
	width = 1200,
	height = 627,
) {
	if (!image) return
	// biome-ignore lint/suspicious/noFocusedTests: false positive
	const url = urlForImage(image)?.width(1200).height(627).fit("crop").url()
	if (!url) return
	return { url, alt: "og image", width, height }
}
