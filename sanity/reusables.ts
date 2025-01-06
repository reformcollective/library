import { attrs, styled } from "library/styled"
import type { StaticImageData } from "next/image"
import { defineField, type ImageDefinition } from "sanity"
import UniversalImage from "./SanityImage"

export const createSectionPreview = (image: StaticImageData) =>
	attrs(
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
	})
