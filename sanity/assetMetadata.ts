import { documentPathProjection } from "sanity/lib/slug-resolver"

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
