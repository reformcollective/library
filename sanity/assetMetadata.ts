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
	value?: string
	blank?: boolean
	parameters?: string
	anchor?: string
	internalSlug: null | string | "/"
}

const internalSlugField = `"internalSlug": select(
		type != "internal" => null,
		${documentPathProjection("internalLink->")}
	)`

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
	}`

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
	}`

const linkProjection = `{ ..., ${internalSlugField} }`

const imageProjection = `{
		...,
		"data": ${imageDataProjection}
	}`

const muxVideoProjection = `{
		...,
		"data": ${muxVideoDataProjection}
	}
`

const videoProjection = `{ ..., muxVideo ${muxVideoProjection} }`

export const linkField = <T extends string>(name: T) =>
	`${name} ${linkProjection}` as const

export const imageField = <T extends string>(name: T) =>
	`${name} ${imageProjection}` as const

export const videoField = <T extends string>(name: T) =>
	`${name} ${videoProjection}` as const
