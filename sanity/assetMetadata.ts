import { createBlurUp } from "@mux/blurup"
import { sleep } from "library/functions"
import { defineQuery, stegaClean } from "next-sanity"
import { cache } from "react"
import { sanityFetch } from "sanity/lib/live"
import { resolveLink } from "sanity/lib/slug-resolver"
import { z } from "zod"

export const getBlurUp = cache(async (playbackId: string) =>
	Promise.race([
		// this call may hang, so add a timeout
		sleep(1000).then(() => ({
			blurDataURL: undefined,
			aspectRatio: undefined,
		})),
		createBlurUp(playbackId, {
			time: 0,
			quality: 2,
		}),
	]).catch(() => ({
		blurDataURL: undefined,
		aspectRatio: undefined,
	})),
)

const assetSchema = z.object({
	asset: z.object({
		_ref: z.string(),
	}),
})

const linkSchema = z.object({
	internalLink: z.object({
		_ref: z.string(),
	}),
	_type: z.string(),
	text: z.optional(z.string()),
	type: z.optional(z.string()),
	url: z.optional(z.string()),
	email: z.optional(z.string()),
	phone: z.optional(z.string()),
	value: z.optional(z.string()),
	blank: z.optional(z.boolean()),
	parameters: z.optional(z.string()),
	anchor: z.optional(z.string()),
})

type VideoAssetMeta = {
	playbackId: string | undefined
	videoThumbnailUrl: string | undefined
	videoBlurUrl: string | undefined
	videoAspectRatio: string | undefined
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
		const { data: assetParse, success: isAsset } = z.safeParse(
			assetSchema,
			input,
		)
		const { data: linkParse, success: isLink } = z.safeParse(linkSchema, input)

		if (isAsset) {
			const { data: asset } = await sanityFetch({
				query: assetQuery,
				params: {
					asset: assetParse.asset._ref,
				},
			})
			if (!asset) return input as Output

			const { blurDataURL } =
				asset?._type === "mux.videoAsset" && asset.playbackId
					? await getBlurUp(stegaClean(asset.playbackId))
					: {}

			const meta = "metadata" in asset ? asset.metadata : null

			const cleanPlaybackId = asset?._type === "mux.videoAsset" && asset.playbackId
				? stegaClean(asset.playbackId)
				: undefined
			const thumbTime = asset?._type === "mux.videoAsset" ? asset.thumbTime : undefined
			const videoThumbnailUrl = cleanPlaybackId
				? `https://image.mux.com/${cleanPlaybackId}/thumbnail.jpg${thumbTime != null ? `?time=${thumbTime}` : ""}`
				: undefined

			const data =
				asset._type === "mux.videoAsset"
					? ({
							playbackId: asset?.playbackId,
							videoThumbnailUrl,
							videoBlurUrl: blurDataURL,
							videoAspectRatio: asset.data?.aspect_ratio?.replace(":", "/"),
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
			const { data: linkedItem } = await sanityFetch({
				query: linkQuery,
				params: { asset: linkParse.internalLink._ref },
			})

			return {
				...input,
				internalSlug: resolveLink(linkedItem),
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
