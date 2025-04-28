import { createBlurUp } from "@mux/blurup"
import { sleep } from "library/functions"
import { defineQuery } from "next-sanity"
import { sanityFetch } from "sanity/lib/live"
import * as v from "valibot"

const assetSchema = v.object({
	asset: v.object({
		_ref: v.string(),
	}),
})

const linkSchema = v.object({
	_type: v.literal("link"),
	internalLink: v.object({
		_ref: v.string(),
	}),
})

type VideoAssetMeta = {
	playbackId: string | undefined
	videoBlurUrl: string | undefined
	videoAspectRatio: number | undefined
	videoDuration: number | undefined
}
type ImageAssetMeta = {
	lqip: string | undefined
	dominantColor: string | undefined
	originalFilename: string | undefined
	size: number | undefined
	extension: string | undefined
	url: string | undefined
}

export type AssetMeta = VideoAssetMeta & ImageAssetMeta

const assetQuery = defineQuery(`
	*[_id == $asset && _type in [
		"sanity.imageAsset",
		"sanity.fileAsset",
		"mux.videoAsset"
	]][0]
`)

const linkQuery = defineQuery(`
	*[_id == $asset && defined(slug.current)][0] {
		slug
	}
`)

export type DeepAssetMeta<T> = T extends { asset?: { _ref?: string } }
	? T & { data?: AssetMeta }
	: T extends { _type: "link"; internalLink?: { _ref?: string } }
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
		const { output: assetParse, success: isAsset } = v.safeParse(
			assetSchema,
			input,
		)
		const { output: linkParse, success: isLink } = v.safeParse(
			linkSchema,
			input,
		)

		if (isAsset) {
			const { data: asset } = await sanityFetch({
				query: assetQuery,
				params: {
					asset: assetParse.asset._ref,
				},
			})
			if (!asset) return input as Output

			const { blurDataURL, aspectRatio } =
				asset?._type === "mux.videoAsset" && asset.playbackId
					? await Promise.race([
							// this call may hang, so add a timeout
							sleep(5000).then(() => ({
								blurDataURL: undefined,
								aspectRatio: undefined,
							})),
							createBlurUp(asset.playbackId, {
								time: 0,
								quality: 2,
							}),
						]).catch(() => ({
							blurDataURL: undefined,
							aspectRatio: undefined,
						}))
					: {}

			const meta = "metadata" in asset ? asset.metadata : null

			const data =
				asset._type === "mux.videoAsset"
					? ({
							playbackId: asset?.playbackId,
							videoBlurUrl: blurDataURL,
							videoAspectRatio: aspectRatio,
							videoDuration: asset?.data?.duration,
						} satisfies VideoAssetMeta)
					: ({
							lqip: meta?.lqip,
							dominantColor: meta?.palette?.dominant?.background,
							originalFilename: asset?.originalFilename,
							size: asset?.size,
							extension: asset?.extension,
							url: asset?.url,
						} satisfies ImageAssetMeta)

			return {
				...input,
				data,
			} as Output
		}

		if (isLink) {
			const { data: link } = await sanityFetch({
				query: linkQuery,
				params: { asset: linkParse.internalLink._ref },
			})

			return {
				...input,
				internalSlug: link?.slug?.current,
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
