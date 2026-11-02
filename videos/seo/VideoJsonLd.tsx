import type { VideoField } from "library/sanity/assetMetadata"
import { videoObjectJsonLd } from "library/videos/seo/videoObjectJsonLd"
import type { VideoJsonLdContext } from "library/videos/types"

interface VideoJsonLdProps {
	video: VideoField
	pageUrl?: string
	context?: VideoJsonLdContext
}

export function VideoJsonLd({ video, pageUrl, context }: VideoJsonLdProps) {
	const data = videoObjectJsonLd({ video, pageUrl, context })
	if (!data) return null
	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(data).replace(/</g, "\\u003c"),
			}}
		/>
	)
}
