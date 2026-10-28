import {
	Box,
	Button,
	Card,
	Checkbox,
	Dialog,
	Flex,
	Stack,
	Text,
} from "@sanity/ui"
import type { VideoField } from "library/sanity/assetMetadata"
import type { VideoProvider } from "library/videos/types"
import { useState } from "react"
import { type FormPatch, set, setIfMissing, useClient } from "sanity"

import {
	fetchLookup,
	type LookupMetaKey,
	type LookupReliability,
	type LookupTarget,
	type StoredThumbnail,
} from "./lookupClient"

type SanityClientLike = ReturnType<typeof useClient>

interface ProposalRow {
	key: string
	label: string
	path: string[]
	current: string
	display: string
	proposed: string | StoredThumbnail
	reliability: LookupReliability
}

interface MuxAssetDocument {
	filename?: string
	data?: { duration?: number; created_at?: string | number }
}

const META_ROWS: { key: LookupMetaKey; label: string; path: string[] }[] = [
	{ key: "title", label: "Title", path: ["title"] },
	{ key: "description", label: "Description", path: ["jsonLd", "description"] },
	{ key: "uploadDate", label: "Upload date", path: ["jsonLd", "uploadDate"] },
	{ key: "duration", label: "Duration", path: ["jsonLd", "duration"] },
	{
		key: "creatorName",
		label: "Creator name",
		path: ["jsonLd", "creatorName"],
	},
]

function currentValue(value: Partial<VideoField>, path: string[]) {
	if (path[0] === "title") return value.title ?? ""
	const jsonLd = value.jsonLd
	if (!jsonLd) return ""
	const field = path[1]
	if (field === "description") return jsonLd.description ?? ""
	if (field === "uploadDate") return jsonLd.uploadDate ?? ""
	if (field === "duration") return jsonLd.duration ?? ""
	if (field === "creatorName") return jsonLd.creatorName ?? ""
	return ""
}

function secondsToIso(totalSeconds: number) {
	const rounded = Math.round(totalSeconds)
	const hours = Math.floor(rounded / 3600)
	const minutes = Math.floor((rounded % 3600) / 60)
	const seconds = rounded % 60
	return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${seconds || (!hours && !minutes) ? `${seconds}S` : ""}`
}

function muxDate(createdAt: string | number) {
	const numeric = Number(createdAt)
	const date = Number.isFinite(numeric)
		? new Date(numeric * 1000)
		: new Date(createdAt)
	return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

async function muxRows(
	client: SanityClientLike,
	value: Partial<VideoField>,
): Promise<ProposalRow[]> {
	const ref = value.muxVideo?.asset?._ref
	if (!ref) return []
	const asset = await client.getDocument<MuxAssetDocument>(ref)
	if (!asset) return []
	const rows: ProposalRow[] = []
	const duration = asset.data?.duration
	if (typeof duration === "number") {
		const iso = secondsToIso(duration)
		rows.push({
			key: "duration",
			label: "Duration",
			path: ["jsonLd", "duration"],
			current: currentValue(value, ["jsonLd", "duration"]),
			display: iso,
			proposed: iso,
			reliability: "reliable",
		})
	}
	const createdAt = asset.data?.created_at
	const date = createdAt === undefined ? null : muxDate(createdAt)
	if (date)
		rows.push({
			key: "uploadDate",
			label: "Upload date (upload time, not publish time)",
			path: ["jsonLd", "uploadDate"],
			current: currentValue(value, ["jsonLd", "uploadDate"]),
			display: date,
			proposed: date,
			reliability: "best-effort",
		})
	if (asset.filename)
		rows.push({
			key: "title",
			label: "Title (from file name)",
			path: ["title"],
			current: currentValue(value, ["title"]),
			display: asset.filename,
			proposed: asset.filename,
			reliability: "best-effort",
		})
	return rows
}

async function remoteRows(
	target: LookupTarget,
	value: Partial<VideoField>,
): Promise<{ rows: ProposalRow[]; warnings: string[] }> {
	const result = await fetchLookup("meta", target)
	const rows: ProposalRow[] = []
	for (const { key, label, path } of META_ROWS) {
		const entry = result.meta?.[key]
		if (!entry) continue
		rows.push({
			key,
			label,
			path,
			current: currentValue(value, path),
			display: entry.value,
			proposed: entry.value,
			reliability: entry.reliability,
		})
	}
	const poster = await fetchLookup("poster", target)
	if (poster.poster)
		rows.push({
			key: "thumbnail",
			label: "Provider thumbnail",
			path: ["thumbnail"],
			current: value.thumbnail?.url ?? "",
			display: poster.poster.url,
			proposed: { ...poster.poster, fetchedAt: new Date().toISOString() },
			reliability: "reliable",
		})
	return { rows, warnings: [...result.warnings, ...poster.warnings] }
}

interface ProposalDialogProps {
	rows: ProposalRow[]
	warnings: string[]
	onApply: (rows: ProposalRow[]) => void
	onClose: () => void
}

function ProposalDialog({
	rows,
	warnings,
	onApply,
	onClose,
}: ProposalDialogProps) {
	const [checked, setChecked] = useState<Record<string, boolean>>(() =>
		Object.fromEntries(
			rows.map((row) => [
				row.key,
				!row.current && row.reliability === "reliable",
			]),
		),
	)

	return (
		<Dialog
			id="video-generate-from-source"
			header="Generate from source"
			width={1}
			onClose={onClose}
			footer={
				<Flex padding={3} gap={2} justify="flex-end">
					<Button text="Cancel" mode="ghost" onClick={onClose} />
					<Button
						text="Apply selected"
						tone="primary"
						disabled={!rows.some((row) => checked[row.key])}
						onClick={() => onApply(rows.filter((row) => checked[row.key]))}
					/>
				</Flex>
			}
		>
			<Box padding={4}>
				<Stack space={3}>
					{rows.length === 0 ? (
						<Text size={1}>Nothing could be read from this source.</Text>
					) : null}
					{rows.map((row) => (
						<Card key={row.key} padding={3} radius={2} border>
							<Flex gap={3} align="flex-start">
								<Checkbox
									checked={checked[row.key] ?? false}
									onChange={(event) => {
										const next = event.currentTarget.checked
										setChecked((previous) => ({ ...previous, [row.key]: next }))
									}}
								/>
								<Stack space={2}>
									<Text size={1} weight="semibold">
										{row.label} (
										{row.reliability === "reliable"
											? "reliable"
											: "best effort"}
										)
									</Text>
									{row.current ? (
										<Text size={1} muted>
											Current: {row.current}. Checking replaces it.
										</Text>
									) : null}
									<Text size={1}>{row.display}</Text>
								</Stack>
							</Flex>
						</Card>
					))}
					{warnings.map((warning) => (
						<Text key={warning} size={1} muted>
							{warning}
						</Text>
					))}
				</Stack>
			</Box>
		</Dialog>
	)
}

interface GenerateFromSourceProps {
	/** The video object being edited. */
	value: Partial<VideoField>
	provider: VideoProvider | null
	/** Lookup target for iframe providers. Null for Mux and plain files. */
	target: LookupTarget | null
	onChange: (patches: FormPatch[]) => void
}

export function GenerateFromSource({
	value,
	provider,
	target,
	onChange,
}: GenerateFromSourceProps) {
	const client = useClient({ apiVersion: "2025-02-19" })
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [proposal, setProposal] = useState<{
		rows: ProposalRow[]
		warnings: string[]
	} | null>(null)

	const available = provider === "mux" || target !== null

	const generate = async () => {
		setBusy(true)
		setError(null)
		let failure: unknown
		try {
			if (provider === "mux") {
				setProposal({ rows: await muxRows(client, value), warnings: [] })
			} else if (target) {
				setProposal(await remoteRows(target, value))
			}
		} catch (caught) {
			failure = caught
		}
		if (failure !== undefined)
			setError(failure instanceof Error ? failure.message : "Lookup failed")
		setBusy(false)
	}

	const apply = (rows: ProposalRow[]) => {
		const patches: FormPatch[] = []
		if (rows.some((row) => row.path[0] === "jsonLd"))
			patches.push(setIfMissing({}, ["jsonLd"]))
		for (const row of rows) patches.push(set(row.proposed, row.path))
		onChange(patches)
		setProposal(null)
	}

	if (!available) return null

	return (
		<Stack space={2}>
			<Flex>
				<Button
					text={busy ? "Reading source..." : "Generate from source"}
					mode="ghost"
					fontSize={1}
					disabled={busy}
					onClick={() => void generate()}
				/>
			</Flex>
			{error ? (
				<Card padding={2} radius={2} tone="critical">
					<Text size={1}>{error}</Text>
				</Card>
			) : null}
			{proposal ? (
				<ProposalDialog
					rows={proposal.rows}
					warnings={proposal.warnings}
					onApply={apply}
					onClose={() => setProposal(null)}
				/>
			) : null}
		</Stack>
	)
}
