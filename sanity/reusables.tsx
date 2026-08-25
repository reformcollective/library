import { InfoOutlineIcon, PlayIcon } from "@sanity/icons"
import libraryConfig from "app/libraryConfig"
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
	type ArrayOfType,
	type BlockDecoratorDefinition,
	type BlockListDefinition,
	type BlockStyleDefinition,
	defineArrayMember,
	defineField,
	defineType,
	getValueAtPath,
	type ImageDefinition,
	type ObjectDefinition,
	type Path,
	type SanityDocument,
} from "sanity"
import { requiredLinkField } from "sanity-plugin-link-field"

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

export const createSectionPreview = (
	image: StaticImageData,
	background?: string,
) =>
	function SectionPreview() {
		const bg = background
		return (
			<div
				style={{
					width: "160px",
					height: "90px",
					borderRadius: "0.1875rem",
					overflow: "hidden",
					flexShrink: 0,
					background: bg,
				}}
			>
				<img
					alt=""
					src={image.src}
					style={{
						width: "100%",
						height: "100%",
						objectFit: "contain",
						display: "block",
					}}
				/>
			</div>
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
			_type: "link",
			type: defaultType,
			blank: defaultToNewTab ?? defaultType === "external",
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
		iconBackground,
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
		/** optional CSS background color for the section preview icon (e.g. "#fff", "black") */
		iconBackground?: string
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
			icon: createSectionPreview(
				icon,
				iconBackground ?? libraryConfig.sectionPreviewBackground,
			),
			fields: [
				...(options.fields ?? []),
				defineField({
					type: "string",
					name: "headerMode",
					title: "Header Mode",
					description:
						"Controls the header's color scheme while this section is scrolled behind it.",
					options: {
						list: [
							{ title: "Light", value: "light" },
							{ title: "Dark", value: "dark" },
						],
						layout: "radio",
					},
					initialValue: "light",
				}),
			],
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
		universalImage({
			name: "posterImage",
			title: "Poster Image",
			description:
				"Optional. If set, this image is shown in place of the video's default thumbnail.",
			withAlt: false,
			hidden: ({ parent }) => parent?.sourceType !== "mux",
		}),
	],
})

/**
 * The link annotation `faqItem` enables by default. Accepts http, https, mailto,
 * and tel URLs, and renders through `UniversalLink`.
 *
 * Exported so a project can keep the default link while replacing everything else.
 *
 * @example
 * faqItem({ annotations: [faqLink, myTooltipAnnotation] })
 */
export const faqLink: ArrayOfType<"object" | "reference"> = {
	title: "Link",
	name: "link",
	type: "object",
	fields: [
		{
			title: "URL",
			name: "href",
			type: "url",
			validation: (rule) =>
				rule.uri({
					scheme: ["http", "https", "mailto", "tel"],
				}),
		},
	],
}

/**
 * A single FAQ entry: a question and a rich-text answer.
 *
 * Call this at your registration site in `sanity.config.ts`. The arguments are how
 * **this project** decides what its editors can put in an answer — changing the
 * available marks should never mean editing the library.
 *
 * Registering it also makes typegen emit a named `FaqItem` in `sanity.types.ts`.
 * Type components against that, rather than reaching into a section's query result
 * (`GetSectionType<"faq">["items"][number]`), which welds the component to one
 * project's section name and stops it compiling anywhere else.
 *
 * Called bare you get: `normal` blocks, bold + italic, bulleted + numbered lists,
 * and {@link faqLink}.
 *
 * Anything you enable already has a renderer in `library/sanity/PortableText`, so it
 * displays correctly with no component code. Those renderers live in the `library`
 * cascade layer, so unlayered project CSS restyles them without a `components`
 * override — reach for `components` only to take a renderer over entirely.
 *
 * Decorator values must match the marks PortableText knows: `strong`, `em`, `code`,
 * `underline`, `strike-through`, `super`, `sub`. Block styles may be `normal`,
 * `h1`–`h6`, or `blockquote`.
 *
 * **Each option replaces its default list.** The lists are not merged, and there is no
 * per-mark removal — to drop one mark, pass the ones you are keeping. An empty array is
 * therefore how you remove a whole category: `annotations: []` disallows links outright.
 *
 * `styles` is the one exception. `styles: []` does not give you an empty style list —
 * Sanity re-inserts `normal` whenever it is missing, so `normal` is always available.
 *
 * Trim at scaffold time. Adding a mark later is backward compatible. Removing one after
 * content exists does not rewrite that content: the mark stays in the stored portable
 * text and still renders on the front end, because the renderers in
 * `library/sanity/PortableText` are unconditional. What changes is the Studio, which no
 * longer offers the control — leaving spans carrying a mark editors can't apply or clear.
 *
 * @example
 * // sanity.config.ts — the defaults
 * schema: { types: [youtube, video, faqItem()] }
 *
 * @example
 * // the design has no list treatment
 * faqItem({ lists: [] })
 *
 * @example
 * // plain paragraphs and links, nothing else
 * faqItem({ lists: [], decorators: [] })
 *
 * @example
 * // the design has no bold — list the decorator you are keeping, not the one you are dropping
 * faqItem({ decorators: [{ title: "Italic", value: "em" }] })
 *
 * @example
 * // bold only, no italic
 * faqItem({ decorators: [{ title: "Bold", value: "strong" }] })
 *
 * @example
 * // bulleted lists only — numbered steps are not in the design
 * faqItem({ lists: [{ title: "Bulleted", value: "bullet" }] })
 *
 * @example
 * // more emphasis options than the default bold + italic
 * faqItem({
 * 	decorators: [
 * 		{ title: "Bold", value: "strong" },
 * 		{ title: "Italic", value: "em" },
 * 		{ title: "Underline", value: "underline" },
 * 		{ title: "Strikethrough", value: "strike-through" },
 * 	],
 * })
 *
 * @example
 * // long answers need sub-headings
 * faqItem({
 * 	styles: [
 * 		{ title: "Normal", value: "normal" },
 * 		{ title: "Heading", value: "h3" },
 * 	],
 * })
 * // renders via the library default; override with components={{ block: { h3: ... } }}
 *
 * @example
 * // answers must not contain links
 * faqItem({ annotations: [] })
 *
 * @example
 * // keep the default link, add a project-specific annotation
 * faqItem({ annotations: [faqLink, myTooltipAnnotation] })
 */
export const faqItem = ({
	styles = [{ title: "Normal", value: "normal" }],
	lists = [
		{ title: "Bulleted", value: "bullet" },
		{ title: "Numbered", value: "number" },
	],
	decorators = [
		{ title: "Bold", value: "strong" },
		{ title: "Italic", value: "em" },
	],
	annotations = [faqLink],
}: {
	styles?: BlockStyleDefinition[]
	lists?: BlockListDefinition[]
	decorators?: BlockDecoratorDefinition[]
	annotations?: ArrayOfType<"object" | "reference">[]
} = {}) =>
	defineType({
		name: "faqItem",
		type: "object",
		title: "FAQ Item",
		fields: [
			defineField({
				type: "string",
				name: "question",
				title: "Question",
				validation: (rule) => rule.required(),
			}),
			defineField({
				type: "array",
				name: "answer",
				title: "Answer",
				validation: (rule) => rule.required(),
				of: [
					defineArrayMember({
						type: "block",
						styles,
						lists,
						marks: { decorators, annotations },
					}),
				],
			}),
		],
		preview: {
			select: { title: "question" },
		},
	})

/**
 * An array of FAQ entries, for use in any section that needs one.
 *
 * Requires `faqItem()` to be registered in `sanity.config.ts` — the Studio will
 * error on an unknown type otherwise. What editors can write inside each entry is
 * configured there, not here; see {@link faqItem}.
 *
 * @example
 * // the common case
 * fields: [kicker, title, faqItems()]
 *
 * @example
 * // rename the field, and describe it for editors
 * fields: [
 * 	faqItems({
 * 		name: "questions",
 * 		title: "Common Questions",
 * 		description: "Shown in the order listed here.",
 * 	}),
 * ]
 *
 * @example
 * // two independent FAQ fields in one section
 * fields: [
 * 	faqItems({ name: "generalFaqs", title: "General" }),
 * 	faqItems({ name: "billingFaqs", title: "Billing" }),
 * ]
 *
 * @example
 * // a project type of your own instead of the shared one
 * fields: [faqItems({ of: [{ type: "myFaqItem" }] })]
 */
export const faqItems = ({
	name = "items",
	title = "FAQ Items",
	of,
	...schemaField
}: {
	name?: string
	title?: string
	of?: ArrayOfType[]
	description?: string
} = {}) =>
	defineField({
		...schemaField,
		name,
		title,
		type: "array",
		of: of ?? [defineArrayMember({ type: "faqItem" })],
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
