import { PlayIcon } from "@sanity/icons"
import {
	MATCH_URL_YOUTUBE,
	MATCH_URL_VIMEO,
	MATCH_URL_WISTIA,
	MATCH_URL_SPOTIFY,
	MATCH_URL_TWITCH,
	MATCH_URL_TIKTOK,
} from "react-player/patterns"
import type libraryConfig from "app/libraryConfig"
import { attrs, styled } from "library/styled"
import type { StaticImageData } from "next/image"
import type {
	AutocompleteString,
	IntrinsicTypeName,
	StrictDefinition,
} from "sanity"
import {
	defineArrayMember,
	defineField,
	defineType,
	type ImageDefinition,
} from "sanity"
import { requiredLinkField } from "sanity-plugin-link-field"

export const createSectionPreview = (image: StaticImageData) =>
	attrs(
		styled("img", {
			width: 160,
			height: 90,
			borderRadius: "0.1875rem",
			objectFit: "cover !important" as "cover",
		}),
		{ src: image.src, alt: "" },
	)

export const universalImage = <
	CropType extends "css" | "sanity" | "uncropped" | undefined = undefined,
	WithAlt extends boolean | undefined = undefined,
>({
	cropType,
	withAlt,
	...schemaField
}: Omit<ImageDefinition, "type"> & {
	/**
	 * if we're cropping the image, how will we do it?
	 *
	 * `css` means we'll crop the image in the CSS.
	 * this is the safest and easiest, but we don't get hotspots.
	 * this is the default
	 *
	 * `sanity` means we'll crop the image at build time using sanity's CMS.
	 * this gets us hotspots and cropping, but we have to specify the aspect ratio in our props.
	 *
	 * `uncropped` means we'll not crop the image at all.
	 * this is ideal for images we won't know the size of, like inline blog images
	 *
	 * @default css
	 */
	cropType?: CropType
	/**
	 * if you need to omit the alt text field - sometimes it's not needed
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
				validation: withAlt === false ? undefined : (rule) => rule.required(),
				hidden: withAlt === false,
			}),
			defineField({
				type: "string",
				name: "cropType",
				options: {
					list: [cropType ?? "css"],
				},
				hidden: true,
				readOnly: true,
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
			// if we're manually cropping, we don't want hotspots (they will be ignored front-end)
			hotspot: cropType && cropType !== "css",
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

export function definePageSection<
	const TType extends IntrinsicTypeName | AutocompleteString,
	const TName extends string,
	TSelect extends Record<string, string> | undefined,
	// biome-ignore lint/suspicious/noExplicitAny: intentional behavior
	TPrepareValue extends Record<keyof TSelect, any> | undefined,
	TAlias extends IntrinsicTypeName | undefined,
	TStrict extends StrictDefinition,
>(
	{
		group,
		icon,
		...options
	}: Omit<
		Parameters<
			typeof defineArrayMember<
				TType,
				TName,
				TSelect,
				TPrepareValue,
				TAlias,
				TStrict
			>
		>[0],
		"groups" | "icon"
	> & {
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
			TType,
			TName,
			TSelect,
			TPrepareValue,
			TAlias,
			TStrict
		>
	>[1],
) {
	return defineArrayMember(
		// @ts-expect-error doesn't match due to narrowing constraints
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
	{ title: "Mux Video", value: "mux" },
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
			hidden: ({ parent }) => !parent?.sourceType || parent.sourceType === "mux",
			validation: (rule) =>
				rule.custom((value, context) => {
					const sourceType = (context.parent as { sourceType?: string })?.sourceType
					if (!sourceType || sourceType === "mux" || sourceType === "url") return true
					if (!value) return "URL is required"
					const pattern = videoSourceValidation[sourceType]
					if (pattern && !pattern.test(value)) {
						const label = videoSourceTypes.find((s) => s.value === sourceType)?.title
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
