import type { SanityImageCrop, SanityImageHotspot } from "@/sanity.types"
import { defineQuery } from "next-sanity"
import { sanityFetch } from "sanity/lib/live"

export type SanityImageData = {
	asset?: { _ref: string }
	hotspot?: SanityImageHotspot
	crop?: SanityImageCrop
	data?: {
		lqip?: string
		blurHash?: string
		dominantColor?: string
		originalFilename?: string
		size?: number
		extension?: string
		url?: string
	}
}

const imageQuery = defineQuery(`
	*[_id == $asset && _type == "sanity.imageAsset"][0]
`)

const fileQuery = defineQuery(`
	*[_id == $asset && _type == "sanity.fileAsset"][0]	
`)

export type DeepImageMeta<T> = T extends { asset?: { _ref?: string } }
	? T & { data?: SanityImageData["data"] }
	: T extends object
		? { [K in keyof T]: DeepImageMeta<T[K]> }
		: T

export const fetchImageMeta = async <InputType>(
	input: InputType,
): Promise<DeepImageMeta<InputType>> => {
	type Output = DeepImageMeta<InputType>

	if (Array.isArray(input)) {
		return (await Promise.all(input.map((i) => fetchImageMeta(i)))) as Output
	}

	if (typeof input === "object" && input !== null) {
		if (
			"asset" in input &&
			input.asset &&
			typeof input.asset === "object" &&
			input.asset !== null &&
			"_ref" in input.asset &&
			typeof input.asset._ref === "string"
		) {
			const { data: imageAsset } = await sanityFetch({
				query: imageQuery,
				params: {
					asset: input.asset._ref,
				},
			})
			const { data: fileAsset } = await sanityFetch({
				query: fileQuery,
				params: {
					asset: input.asset._ref,
				},
			})

			return {
				...input,
				data: {
					blurHash: imageAsset?.metadata?.blurHash,
					lqip: imageAsset?.metadata?.lqip,
					dominantColor: imageAsset?.metadata?.palette?.dominant?.background,
					originalFilename: fileAsset?.originalFilename,
					size: fileAsset?.size,
					extension: fileAsset?.extension,
					url: fileAsset?.url,
				} satisfies NonNullable<SanityImageData["data"]>,
			} as Output
		}

		return Object.fromEntries(
			await Promise.all(
				Object.entries(input).map(
					async ([key, value]) => [key, await fetchImageMeta(value)] as const,
				),
			),
		) as Output
	}

	return input as Output
}
