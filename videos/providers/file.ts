import type {
	ProviderAdapterFactory,
	VideoFileSource,
} from "library/videos/types"
import { createMediaElementAdapter } from "./mediaElementAdapter"

function appendSources(element: HTMLVideoElement, sources: VideoFileSource[]) {
	const first = sources[0]
	if (sources.length === 1 && first && !first.type && !first.media) {
		element.src = first.src
		return
	}
	for (const source of sources) {
		const node = document.createElement("source")
		node.src = source.src
		if (source.type) node.type = source.type
		if (source.media) node.media = source.media
		element.append(node)
	}
}

export function createFileFactory(
	tagName: "video" | "hls-video",
): ProviderAdapterFactory {
	return {
		mount: (container, options) => {
			const { source } = options
			if (source.provider !== "file")
				throw new Error("The file adapter needs a file source")
			const element = document.createElement(tagName) as HTMLVideoElement
			return createMediaElementAdapter(container, {
				element,
				provider: "file",
				options,
				assignSource: (target) => appendSources(target, source.sources),
			})
		},
	}
}

export const factory: ProviderAdapterFactory = createFileFactory("video")
