import { attrs, styled } from "library/styled"
import type { StaticImageData } from "next/image"
import { type ImageDefinition, defineArrayMember, defineField } from "sanity"
import { requiredLinkField } from "sanity-plugin-link-field"
import UniversalImage from "./SanityImage"

export const createSectionPreview = (image: StaticImageData) =>
	attrs(
		// @ts-ignore potential styled type mismatch
		styled(UniversalImage, {
			width: 160,
			height: 90,
			borderRadius: "0.1875rem",
			objectFit: "cover !important",
		}),
		{ src: image, alt: "", objectFit: "cover" },
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
				image: "asset.url",
				title: "asset.title",
				fallback: "asset.originalFilename",
			},
			prepare({ image, alt, fallback, title }) {
				return {
					imageUrl: image,
					title: alt || title || fallback,
				}
			},
		},
	})

export const universalLink = ({
	withText = true,
	required,
	...props
}: {
	name: string
	title?: string
	withText?: boolean
	required?: boolean
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
