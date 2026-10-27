import { Card, Stack, Text } from "@sanity/ui"
import type { VideoField } from "library/sanity/assetMetadata"
import { parseVideoUrl } from "library/videos/providers/parse"
import { supports } from "library/videos/capabilities"
import { LIMITATIONS } from "library/videos/capabilities"
import { type ObjectInputProps } from "sanity"

import { GenerateFromSource } from "./GenerateFromSource"
import { toLookupTarget } from "./lookupClient"
import { PosterPanel } from "./PosterPanel"
import { providerOf } from "./videoFields"

export function VideoInput(props: ObjectInputProps) {
	const value = (props.value ?? {}) as Partial<VideoField>
	const provider = providerOf(value)
	const url = value.url ?? ""
	const target = toLookupTarget(url ? parseVideoUrl(url) : null)
	const canLookup =
		provider !== null && target !== null && supports(provider, "providerPoster") !== "no"
	const isHero = props.schemaType.options?.lcp === true
	const youtubeBackground = provider === "youtube" && value.mode === "background"

	return (
		<Stack space={4}>
			{props.renderDefault(props)}
			{youtubeBackground ? (
				<Card padding={3} radius={2} tone="caution" border>
					<Text size={1}>{LIMITATIONS.youtube[2]}</Text>
				</Card>
			) : null}
			<PosterPanel
				value={value}
				provider={provider}
				target={target}
				canLookup={canLookup}
				isHero={isHero}
				onChange={props.onChange}
			/>
			<GenerateFromSource
				value={value}
				provider={provider}
				target={target}
				onChange={props.onChange}
			/>
		</Stack>
	)
}
