import { defineQuery } from "next-sanity"
import { sanityFetch } from "sanity/lib/live"

export type AssetMeta = {
	lqip?: string
	blurHash?: string
	dominantColor?: string
	originalFilename?: string
	size?: number
	extension?: string
	url?: string
}

const imageQuery = defineQuery(`
	*[_id == $asset && _type == "sanity.imageAsset"][0]
`)

const fileQuery = defineQuery(`
	*[_id == $asset && _type == "sanity.fileAsset"][0]	
`)

const linkQuery = defineQuery(`
	*[_id == $link && defined(slug.current)][0]
`)

export type DeepAssetMeta<T> = T extends { asset?: { _ref?: string } }
	? T & { data?: AssetMeta }
	: T extends { internalLink?: { _ref?: string } }
		? T & { internalSlug?: string }
		: T extends object
			? { [K in keyof T]: DeepAssetMeta<T[K]> }
			: T

export const fetchAssetMeta = async <InputType>(
	input: InputType,
): Promise<DeepAssetMeta<InputType>> => {
	type Output = DeepAssetMeta<InputType>

	if (Array.isArray(input)) {
		return (await Promise.all(input.map((i) => fetchAssetMeta(i)))) as Output
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

			const asset = imageAsset ?? fileAsset

			return {
				...input,
				data: {
					blurHash: imageAsset?.metadata?.blurHash,
					lqip: imageAsset?.metadata?.lqip,
					dominantColor: imageAsset?.metadata?.palette?.dominant?.background,
					originalFilename: asset?.originalFilename,
					size: asset?.size,
					extension: asset?.extension,
					url: asset?.url,
				} satisfies NonNullable<AssetMeta>,
			} as Output
		}

		if (
			"internalLink" in input &&
			input.internalLink &&
			typeof input.internalLink === "object" &&
			input.internalLink !== null &&
			"_ref" in input.internalLink &&
			typeof input.internalLink._ref === "string"
		) {
			const { data: link } = await sanityFetch({
				query: linkQuery,
				params: {
					link: input.internalLink._ref,
				},
			})

			return {
				...input,
				slug: link?.slug?.current,
			} as Output
		}

		return Object.fromEntries(
			await Promise.all(
				Object.entries(input).map(
					async ([key, value]) => [key, await fetchAssetMeta(value)] as const,
				),
			),
		) as Output
	}

	return input as Output
}
