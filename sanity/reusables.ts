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
		{ src: image, alt: "" },
	)

export const imageWithAlt = (schemaField: Omit<ImageDefinition, "type">) =>
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
		],
		options: {
			aiAssist: {
				imageDescriptionField: "alt",
				...schemaField.options?.aiAssist,
			},
			hotspot: true,
			...schemaField.options,
		},
	})
