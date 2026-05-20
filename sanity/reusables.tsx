import { InfoOutlineIcon, PlayIcon } from "@sanity/icons"
import type libraryConfig from "app/libraryConfig"
import { requiredLinkField } from "library/link/linkField"
import type { StaticImageData } from "next/image"
import {
	MATCH_URL_SPOTIFY,
	MATCH_URL_TIKTOK,
	MATCH_URL_TWITCH,
	MATCH_URL_VIMEO,
	MATCH_URL_WISTIA,
	MATCH_URL_YOUTUBE,
} from "react-player/patterns"
import type { PreviewValue, StrictDefinition } from "sanity"
import {
	type ArrayOfEntry,
	defineArrayMember,
	defineField,
	defineType,
	getValueAtPath,
	type ImageDefinition,
	type ObjectDefinition,
	type Path,
	type SanityDocument,
} from "sanity"

type HiddenValidationContext = {
	currentUser?: unknown
	document?: SanityDocument
	parent?: unknown
	path?: Path
}

function isFieldHidden(
	hidden: ImageDefinition["hidden"],
	context: HiddenValidationContext,
) {
	if (!hidden) return false
	if (typeof hidden !== "function") return Boolean(hidden)
	const path = Array.isArray(context.path) ? context.path : []
	const fieldPath = path.slice(0, -1)
	const containerPath = fieldPath.slice(0, -1)
	return Boolean(
		hidden({
			currentUser: context.currentUser as never,
			document: context.document,
			parent: context.document
				? getValueAtPath(context.document, containerPath)
				: undefined,
			path: fieldPath,
			value: context.parent,
		}),
	)
}

export const createSectionPreview = (image: StaticImageData) =>
	function SectionPreview() {
		return (
			<img
				alt=""
				src={image.src}
				style={{
					width: 160,
					height: 90,
					borderRadius: "0.1875rem",
					objectFit: "cover",
				}}
			/>
		)
	}

export const universalImage = <
	WithAlt extends boolean | undefined = undefined,
>({
	withAlt,
	...schemaField
}: Omit<ImageDefinition, "type"> & {
	/**
	 * Pass `false` to hide and skip validation on the alt text field.
	 * Omit (or pass `true`) to show and require it.
	 */
	withAlt?: WithAlt
}) =>
	defineField({
		...schemaField,
		type: "image",
		fields: [
			defineField({
				type: "text",
				name: "alt",
				title: "Alternative text",
				rows: 2,
				validation:
					withAlt === false
						? undefined
						: (rule) =>
								rule.custom((value, context) => {
									if (isFieldHidden(schemaField.hidden, context)) return true
									return value ? true : "Required"
								}),
				hidden: withAlt === false,
			}),
			defineField({
				type: "string",
				name: "willHaveAlt",
				options: {
					list: [withAlt === false ? "false" : "true"],
				},
				hidden: true,
				readOnly: true,
			}),

			...(schemaField.fields ?? []),
		],
		options: {
			aiAssist: {
				imageDescriptionField: "alt",
				...schemaField.options?.aiAssist,
			},
			hotspot: true,
			...schemaField.options,
		},
		preview: {
			select: {
				alt: "alt",
				media: "asset",
				fallback: "asset.originalFilename",
			},
			prepare({ alt, media, fallback }) {
				return {
					media,
					title: alt || fallback,
				}
			},
		},
	})

export const universalLink = ({
	withText = true,
	required,
	defaultType = "internal",
	defaultToNewTab,
	...props
}: {
	name: string
	title?: string
	withText?: boolean
	required?: boolean
	defaultType?: "external" | "internal" | "email" | "phone"
	defaultToNewTab?: boolean
}) =>
	defineField({
		...props,
		type: "link",
		options: { enableText: withText },
		validation: (rule) =>
			rule.custom((field?: { type?: string; url?: string }) => {
				if (
					field?.type === "external" &&
					field?.url &&
					!field?.url.startsWith("http")
				)
					return {
						message: "External links must start with https://",
						path: ["url"],
					}
				if (required) return requiredLinkField(field)
				return true
			}),
		initialValue: {
			type: defaultType,
			toNewTab: defaultToNewTab ?? defaultType === "external",
		},
	})

export const redirect = defineArrayMember({
	name: "redirect",
	title: "Redirect",
	type: "object",
	fields: [
		defineField({
			name: "link",
			type: "url",
			description:
				"If someone tries to navigate to this page in any way, they will be redirected to this URL.",
		}),
	],
	preview: {
		select: {
			link: "link",
		},
		prepare({ link }) {
			return {
				title: `Redirect to "${link}"`,
			}
		},
	},
})

export function definePageSection<const TName extends string>(
	{
		group,
		icon,
		...options
	}: Omit<
		ArrayOfEntry<ObjectDefinition>,
		"name" | "groups" | "icon" | "preview"
	> & {
		name: TName
		preview?: {
			select?: Record<string, string>
			prepare?: (value: Record<string, string | undefined>) => PreviewValue
		}
		/**
		 * for example, "Designed for Home"
		 *
		 * will be filterable based on this category in the studio
		 */
		group: (typeof libraryConfig)["pageSectionGroups"][number]
		/**
		 * use browser devtools to capture an image of the section (ideally 1600x900 but can be any size)
		 */
		icon: StaticImageData
	},
	secondary?: Parameters<
		typeof defineArrayMember<
			"object",
			TName,
			undefined,
			undefined,
			undefined,
			StrictDefinition
		>
	>[1],
) {
	return defineArrayMember(
		{
			...options,
			groups: [{ name: group }],
			icon: createSectionPreview(icon),
		},
		secondary,
	)
}

export const youtube = defineType({
	name: "youtube",
	type: "object",
	title: "YouTube",
	icon: PlayIcon,
	fields: [
		defineField({
			name: "url",
			type: "url",
			title: "YouTube video URL",
		}),
	],
})

/**
 * URL validation patterns sourced from react-player.
 * @see https://github.com/cookpete/react-player/blob/master/src/patterns.ts
 */
const videoSourceValidation: Record<string, RegExp> = {
	youtube: MATCH_URL_YOUTUBE,
	vimeo: MATCH_URL_VIMEO,
	wistia: MATCH_URL_WISTIA,
	spotify: MATCH_URL_SPOTIFY,
	twitch: MATCH_URL_TWITCH,
	tiktok: MATCH_URL_TIKTOK,
}

const videoSourceTypes = [
	{ title: "Upload or Select a File", value: "mux" },
	{ title: "YouTube", value: "youtube" },
	{ title: "Vimeo", value: "vimeo" },
	{ title: "Wistia", value: "wistia" },
	{ title: "Spotify", value: "spotify" },
	{ title: "Twitch", value: "twitch" },
	{ title: "TikTok", value: "tiktok" },
	{ title: "Video URL", value: "url" },
]

export const video = defineType({
	name: "video",
	type: "object",
	title: "Video",
	icon: PlayIcon,
	fields: [
		defineField({
			name: "sourceType",
			type: "string",
			title: "Source",
			options: {
				list: videoSourceTypes,
			},
			initialValue: "mux",
		}),
		defineField({
			name: "url",
			type: "url",
			title: "Video URL",
			hidden: ({ parent }) =>
				!parent?.sourceType || parent.sourceType === "mux",
			validation: (rule) =>
				rule.custom((value, context) => {
					const sourceType = (context.parent as { sourceType?: string })
						?.sourceType
					if (!sourceType || sourceType === "mux" || sourceType === "url")
						return true
					if (!value) return "URL is required"
					const pattern = videoSourceValidation[sourceType]
					if (pattern && !pattern.test(value)) {
						const label = videoSourceTypes.find(
							(s) => s.value === sourceType,
						)?.title
						return `This doesn't look like a valid ${label} URL`
					}
					return true
				}),
		}),
		defineField({
			name: "muxVideo",
			type: "mux.video",
			title: "Mux Video",
			hidden: ({ parent }) => parent?.sourceType !== "mux",
		}),
	],
})

/**
 * Renders a non-editable info callout in the Studio form.
 * No data is stored — purely a UI hint for editors.
 */
export const calloutField = ({
	name = "documentationHint",
	message,
}: {
	name?: string
	message: string
}) =>
	defineField({
		name,
		type: "string",
		readOnly: true,
		components: {
			field: () => (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 8,
						padding: "10px 14px",
						borderRadius: 4,
						background: "rgba(0 0 0 / 5%)",
						border: "1px solid rgba(0 0 0 / 10%)",
						fontSize: 13,
						opacity: 0.75,
					}}
				>
					<InfoOutlineIcon style={{ flexShrink: 0 }} />
					{message}
				</div>
			),
		},
	})
