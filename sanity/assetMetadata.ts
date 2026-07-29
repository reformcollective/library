import { documentPathProjection } from "sanity/lib/slug-resolver"
import type {
	MuxVideoAssetReference,
	SanityImageAssetReference,
	SanityImageCrop,
	SanityImageHotspot,
} from "sanity.types"

// the three types below were directly copied from the starter's generated types

export type ImageField = {
	asset?: SanityImageAssetReference
	media?: unknown
	hotspot?: SanityImageHotspot
	crop?: SanityImageCrop
	alt?: string
	willHaveAlt?: "true" | "false"
	_type: "image"
	data: {
		lqip: string | null
		dominantColor: string | null
		originalFilename: string | null
		size: number | null
		extension: string | null
		url: string | null
		originalAspectRatio: number | null
		aspectRatio: number | null
	}
}

export type VideoField = {
	_type: "video"
	sourceType?:
		| "mux"
		| "spotify"
		| "tiktok"
		| "twitch"
		| "url"
		| "vimeo"
		| "wistia"
		| "youtube"
	url?: string
	muxVideo: {
		_type: "mux.video"
		asset?: MuxVideoAssetReference
		data: {
			playbackId: string | null
			videoThumbnailUrl: string | null
			videoBlurUrl: string | null
			videoAspectRatio: string | null
			videoDuration: number | null
		}
	} | null
	posterImage: ImageField | null
}

export type LinkField = {
	_type: "link"
	text?: string
	type?: string
	internalLink?: {
		_ref: string
		_type: "reference"
		_weak?: boolean
	}
	url?: string
	email?: string
	phone?: string
	sms?: string
	value?: string
	fileUrl?: string | null
	fileName?: string | null
	blank?: boolean
	parameters?: string
	anchor?: string
	internalSlug: null | string
}

const internalSlugField = `"internalSlug": select(
		type != "internal" => null,
		${documentPathProjection("internalLink->")}
	)` as const
const fileFields =
	`"fileUrl": documentLink.asset->url, "fileName": documentLink.asset->originalFilename` as const

const imageDataProjection = `{
		"lqip": asset->metadata.lqip,
		"dominantColor": asset->metadata.palette.dominant.background,
		"originalFilename": asset->originalFilename,
		"size": asset->size,
		"extension": asset->extension,
		"url": asset->url,
		"originalAspectRatio": asset->metadata.dimensions.aspectRatio,
		"aspectRatio": select(
			(1 - coalesce(crop.left, 0) - coalesce(crop.right, 0)) > 0 &&
			(1 - coalesce(crop.top, 0) - coalesce(crop.bottom, 0)) > 0 =>
				asset->metadata.dimensions.aspectRatio *
				((1 - coalesce(crop.left, 0) - coalesce(crop.right, 0)) /
				(1 - coalesce(crop.top, 0) - coalesce(crop.bottom, 0))),
			asset->metadata.dimensions.aspectRatio
		)
	}` as const

const muxVideoDataProjection = `{
		"playbackId": asset->playbackId,
		"videoThumbnailUrl": select(
			defined(asset->thumbTime) =>
				"https://image.mux.com/" + asset->playbackId + "/thumbnail.jpg?time=" + string(asset->thumbTime),
			"https://image.mux.com/" + asset->playbackId + "/thumbnail.jpg"
		),
		"videoBlurUrl": "https://image.mux.com/" + asset->playbackId + "/thumbnail.webp?time=0&width=32",
		"videoAspectRatio": select(
			defined(asset->data.aspect_ratio) =>
				string::split(asset->data.aspect_ratio, ":")[0] + "/" + string::split(asset->data.aspect_ratio, ":")[1]
		),
		"videoDuration": asset->data.duration
	}` as const

const linkProjection = `{ ..., ${internalSlugField}, ${fileFields} }` as const

const imageProjection = `{
		...,
		"data": ${imageDataProjection}
	}` as const

const muxVideoProjection = `{
		...,
		"data": ${muxVideoDataProjection}
	}
` as const

const videoProjection = `{ ..., muxVideo ${muxVideoProjection}, posterImage ${imageProjection} }` as const

export const assetMetadataFunctions = `
	fn reform::link($link) = $link ${linkProjection};
	fn reform::links($links) = $links[] ${linkProjection};
	fn reform::image($image) = $image ${imageProjection};
	fn reform::images($images) = $images[] ${imageProjection};
	fn reform::video($video) = $video ${videoProjection};
	fn reform::videos($videos) = $videos[] ${videoProjection};
` as const
