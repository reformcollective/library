import "@mux/mux-video"
import type MuxVideoElement from "@mux/mux-video"
import type {
	AdapterMountOptions,
	MuxExtras,
	ProviderAdapterFactory,
} from "library/videos/types"
import { createMediaElementAdapter } from "./mediaElementAdapter"

function applyOptions(element: MuxVideoElement, options: AdapterMountOptions) {
	const { source, mux, muxData } = options
	if (source.provider !== "mux")
		throw new Error("The Mux adapter needs a Mux source")
	if (mux?.minResolution)
		element.setAttribute("min-resolution", mux.minResolution)
	if (mux?.maxResolution)
		element.setAttribute("max-resolution", mux.maxResolution)
	if (mux?.renditionOrder)
		element.setAttribute("rendition-order", mux.renditionOrder)
	if (mux?.maxAutoResolution)
		element.setAttribute("max-auto-resolution", mux.maxAutoResolution)
	if (mux?.capRenditionToPlayerSize !== undefined)
		element.setAttribute(
			"cap-rendition-to-player-size",
			mux.capRenditionToPlayerSize ? "" : "false",
		)
	if (mux?.preferPlayback)
		element.setAttribute("prefer-playback", mux.preferPlayback)
	if (mux?.preferCmcd) element.setAttribute("prefer-cmcd", mux.preferCmcd)
	if (mux?.assetStartTime !== undefined)
		element.setAttribute("asset-start-time", String(mux.assetStartTime))
	if (mux?.assetEndTime !== undefined)
		element.setAttribute("asset-end-time", String(mux.assetEndTime))
	if (mux?.targetLiveWindow !== undefined)
		element.setAttribute("target-live-window", String(mux.targetLiveWindow))
	if (mux?.liveEdgeOffset !== undefined)
		element.setAttribute("live-edge-offset", String(mux.liveEdgeOffset))
	if (mux?.streamType) element.setAttribute("stream-type", mux.streamType)
	if (mux?.redundantStreams) element.setAttribute("redundant-streams", "")
	const customDomain = mux?.customDomain ?? source.customDomain
	if (customDomain) element.setAttribute("custom-domain", customDomain)
	if (muxData === false) {
		element.setAttribute("disable-tracking", "")
		element.setAttribute("disable-cookies", "")
	} else if (typeof muxData === "object") {
		const envKey = muxData.envKey ?? mux?.envKey
		if (envKey) element.setAttribute("env-key", envKey)
		const metadata = muxData.metadata ?? mux?.metadata
		if (metadata) element.metadata = metadata
	}
	if (muxData === true) {
		if (mux?.envKey) element.setAttribute("env-key", mux.envKey)
		if (mux?.metadata) element.metadata = mux.metadata
	}
	if (mux?.beaconCollectionDomain)
		element.setAttribute("beacon-collection-domain", mux.beaconCollectionDomain)
	if (source.tokens) element.tokens = source.tokens
	if (options.startTime !== undefined && options.startTime > 0)
		element.startTime = options.startTime
}

function createExtras(
	element: MuxVideoElement,
	playbackId: string,
	customDomain?: string,
): MuxExtras {
	const host = customDomain ? `image.${customDomain}` : "image.mux.com"
	return {
		addCuePoints: (cues) => {
			void element.addCuePoints(cues)
		},
		storyboardUrl: `https://${host}/${playbackId}/storyboard.vtt`,
		animatedPreviewUrl: (opts) => {
			const params = new URLSearchParams()
			if (opts?.start !== undefined) params.set("start", String(opts.start))
			if (opts?.end !== undefined) params.set("end", String(opts.end))
			if (opts?.width !== undefined) params.set("width", String(opts.width))
			if (opts?.fps !== undefined) params.set("fps", String(opts.fps))
			const query = params.toString()
			const base = `https://${host}/${playbackId}/animated.webp`
			if (!query) return base
			return `${base}?${query}`
		},
	}
}

export const factory: ProviderAdapterFactory = {
	mount: (container, options) => {
		const { source } = options
		if (source.provider !== "mux")
			throw new Error("The Mux adapter needs a Mux source")
		const element = document.createElement("mux-video") as MuxVideoElement
		const extras = createExtras(element, source.playbackId, source.customDomain)
		return createMediaElementAdapter(container, {
			element: element as unknown as HTMLVideoElement,
			provider: "mux",
			options,
			extras: { mux: extras },
			chapterApi: true,
			// mux-video's own load() re-initializes playback, so detach its source by attribute and let disconnect unload it.
			teardown: (target) => {
				target.removeAttribute("playback-id")
				target.removeAttribute("src")
			},
			assignSource: (target) => {
				applyOptions(element, options)
				target.setAttribute("playback-id", source.playbackId)
			},
		})
	},
}
