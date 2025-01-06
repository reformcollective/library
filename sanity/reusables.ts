import UniversalImage, { type UniversalImageData } from "library/UniversalImage"
import { attrs, styled } from "library/styled"
import { defineField, type ImageDefinition } from "sanity"

export const createSectionPreview = (image: UniversalImageData) =>
	attrs(
		styled(UniversalImage, {
			width: 160,
			height: 90,
			borderRadius: "0.1875rem",
			objectFit: "cover !important",
		}),
		{ src: image, alt: "", objectFit: "cover" },
	)

export const imageWithAlt = <
	AspectType extends "known" | "untouched" | "unknown" | undefined = undefined,
>({
	aspectRatioType,
	...schemaField
}: Omit<ImageDefinition, "type"> & {
	/**
	 * `known` means we know exactly what the aspect ratio of the image will be
	 *
	 * `untouched` means we have no idea what the aspect ratio of the image will be
	 * AND we PINKY PROMISE not to try to crop the image in our CSS
	 *
	 * `unknown` means we have no idea what the aspect ratio of the image will be
	 * AND we will be cropping the image in the CSS.
	 * This is pretty safe, but we lose the ability to control hotspots
	 */
	aspectRatioType?: AspectType
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
				validation: (rule) => rule.required(),
			}),
			defineField({
				type: "string",
				name: "aspectRatioType",
				options: {
					list: [aspectRatioType ?? "unknown"],
				},
				hidden: true,
				readOnly: true,
			}),
		],
		options: {
			aiAssist: {
				imageDescriptionField: "alt",
				...schemaField.options?.aiAssist,
			},
			// if we're manually cropping, we don't want hotspots (they will be ignored front-end)
			hotspot: aspectRatioType && aspectRatioType !== "unknown",
			...schemaField.options,
		},
	})
