import { Card, Stack, Text } from "@sanity/ui"
import type { VideoField } from "library/sanity/assetMetadata"
import { LIMITATIONS, supports } from "library/videos/capabilities"
import { parseVideoUrl } from "library/videos/providers/parse"
import type { ObjectInputProps, ObjectMember } from "sanity"

import { GenerateFromSource } from "./GenerateFromSource"
import { toLookupTarget } from "./lookupClient"
import { PosterPanel } from "./PosterPanel"
import { providerOf } from "./videoFields"

const BACKGROUND_FIELDS = new Set(["sourceType", "url", "muxVideo", "posterImage"])
// the section's mode prop overrides mode; thumbnail is filled by the poster lookup
const OVERRIDDEN_FIELDS = new Set(["mode", "thumbnail"])

const isStored = (name: string, value: unknown) =>
	value !== undefined && !(name === "privacy" && value === true)

// stored settings still change playback, so they stay visible until cleared
const isLeftover = (member: ObjectMember) =>
	member.kind === "field" &&
	!BACKGROUND_FIELDS.has(member.name) &&
	(member.field.validation.length > 0 ||
		(!OVERRIDDEN_FIELDS.has(member.name) &&
			isStored(member.name, member.field.value)))

export function VideoInput(props: ObjectInputProps) {
	const value = (props.value ?? {}) as Partial<VideoField>
	const provider = providerOf(value)
	const url = value.url ?? ""
	const target = toLookupTarget(url ? parseVideoUrl(url) : null)
	const canLookup =
		provider !== null &&
		target !== null &&
		supports(provider, "providerPoster") !== "no"
	const isHero = props.schemaType.options?.lcp === true
	const isBackground = props.schemaType.options?.background === true
	const members = isBackground
		? props.members.filter(
				(member) =>
					member.kind !== "field" ||
					BACKGROUND_FIELDS.has(member.name) ||
					isLeftover(member),
			)
		: props.members
	const hasLeftovers = isBackground && props.members.some(isLeftover)
	const youtubeBackground =
		provider === "youtube" && (isBackground || value.mode === "background")

	return (
		<Stack space={4}>
			{props.renderDefault({ ...props, members })}
			{isBackground ? (
				<Card padding={3} radius={2} tone="primary" border>
					<Text size={1}>Plays on a loop, muted, with no controls.</Text>
				</Card>
			) : null}
			{hasLeftovers ? (
				<Card padding={3} radius={2} tone="caution" border>
					<Text size={1}>
						Settings saved before this became a background video still change
						how it plays. Clear the ones shown above.
					</Text>
				</Card>
			) : null}
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
			{isBackground ? null : (
				<GenerateFromSource
					value={value}
					provider={provider}
					target={target}
					onChange={props.onChange}
				/>
			)}
		</Stack>
	)
}
