import { Button, Card, Flex, Stack, Text } from "@sanity/ui"
import type { VideoField } from "library/sanity/assetMetadata"
import type { VideoProvider } from "library/videos/types"
import { useEffect, useEffectEvent, useRef, useState } from "react"
import { type FormPatch, set, setIfMissing, unset, useClient } from "sanity"

import {
	fetchCopy,
	fetchThumbnail,
	type LookupTarget,
	lookupKey,
} from "./lookupClient"

const PREVIEW_WIDTH = 320

const TERMS: Partial<Record<VideoProvider, string>> = {
	spotify:
		"Spotify's terms say not to store thumbnails indefinitely. The automatic poster is refetched, not copied.",
	vimeo:
		"Vimeo's terms bar downloading or copying thumbnails. Saving a copy is your decision.",
	tiktok:
		"TikTok's terms bar downloading or copying content. Saving a copy is your decision.",
	youtube:
		"YouTube limits how long API data may be stored (30 days). Coverage of thumbnails is unconfirmed.",
}

interface PosterPanelProps {
	/** The video object being edited. */
	value: Partial<VideoField>
	/** Resolved provider, or null when the source is not usable yet. */
	provider: VideoProvider | null
	/** Lookup target for iframe providers. Null for Mux and plain files. */
	target: LookupTarget | null
	/** Whether the provider can supply a thumbnail automatically. */
	canLookup: boolean
	/** True when the schema type is marked as a hero (LCP) video. */
	isHero: boolean
	onChange: (patches: FormPatch | FormPatch[]) => void
}

export function PosterPanel({
	value,
	provider,
	target,
	canLookup,
	isHero,
	onChange,
}: PosterPanelProps) {
	const client = useClient({ apiVersion: "2025-02-19" })
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const key = lookupKey(target)
	const thumbnail = value.thumbnail
	const hasUpload = Boolean(value.posterImage?.asset)
	const lastKey = useRef(thumbnail ? key : "")

	const refresh = useEffectEvent(async () => {
		if (!target) return
		setBusy(true)
		setError(null)
		let result: Awaited<ReturnType<typeof fetchThumbnail>> | undefined
		let failure: unknown
		try {
			result = await fetchThumbnail(target)
		} catch (caught) {
			failure = caught
		}
		setBusy(false)
		if (failure !== undefined) {
			setError(failure instanceof Error ? failure.message : "Lookup failed")
			return
		}
		onChange(result ? set(result, ["thumbnail"]) : unset(["thumbnail"]))
	})

	const clearThumbnail = useEffectEvent(() => {
		if (thumbnail) onChange(unset(["thumbnail"]))
	})

	useEffect(() => {
		if (key === lastKey.current) return
		lastKey.current = key
		if (!canLookup || !key) {
			clearThumbnail()
			return
		}
		void refresh()
	}, [canLookup, key])

	const saveCopy = async () => {
		if (!target || !thumbnail) return
		setBusy(true)
		setError(null)
		const filename = `${target.provider}-${target.id}-poster`
		const sourceUrl = thumbnail.url
		let failure: unknown
		try {
			const blob = await fetchCopy(target)
			const asset = await client.assets.upload("image", blob, {
				filename,
				contentType: blob.type,
				source: { id: target.id, name: target.provider, url: sourceUrl },
			})
			onChange([
				setIfMissing({ _type: "image" }, ["posterImage"]),
				set({ _type: "reference", _ref: asset._id }, ["posterImage", "asset"]),
			])
		} catch (caught) {
			failure = caught
		}
		if (failure !== undefined)
			setError(
				failure instanceof Error ? failure.message : "Could not save a copy",
			)
		setBusy(false)
	}

	const isMux = provider === "mux"
	const showHeroWarning = isMux && isHero && !hasUpload
	const showSoftHint = isMux && !isHero && !hasUpload
	const terms = provider ? TERMS[provider] : undefined
	const previewHeight =
		thumbnail?.width && thumbnail.height
			? Math.round((PREVIEW_WIDTH * thumbnail.height) / thumbnail.width)
			: 0

	if (!provider) return null

	return (
		<Stack space={3}>
			{showHeroWarning ? (
				<Card padding={3} radius={2} tone="caution" border>
					<Text size={1}>
						This is a hero video with no uploaded poster. The automatic poster
						from Mux may differ in brightness from the video. Upload a poster
						for the best result.
					</Text>
				</Card>
			) : null}
			{showSoftHint ? (
				<Text size={1} muted>
					Without a poster the video's own first frame is shown.
				</Text>
			) : null}
			{canLookup ? (
				<Card padding={3} radius={2} border>
					<Stack space={3}>
						<Text size={1} weight="semibold">
							{hasUpload ? "Uploaded poster (override)" : "Automatic poster"}
						</Text>
						{thumbnail ? (
							<img
								src={thumbnail.url}
								width={PREVIEW_WIDTH}
								height={previewHeight}
								alt=""
							/>
						) : (
							<Text size={1} muted>
								{busy ? "Looking up thumbnail..." : "No thumbnail found."}
							</Text>
						)}
						<Flex gap={2}>
							<Button
								text="Refresh thumbnail"
								mode="ghost"
								fontSize={1}
								disabled={busy || !target}
								onClick={() => void refresh()}
							/>
							<Button
								text="Save a copy to Sanity"
								mode="ghost"
								fontSize={1}
								disabled={busy || !thumbnail}
								onClick={() => void saveCopy()}
							/>
						</Flex>
						{error ? (
							<Card padding={2} radius={2} tone="critical">
								<Text size={1}>{error}</Text>
							</Card>
						) : null}
						{terms ? (
							<Text size={1} muted>
								{terms}
							</Text>
						) : null}
					</Stack>
				</Card>
			) : null}
		</Stack>
	)
}
