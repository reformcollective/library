import UniversalImage, { type UniversalImageData } from "library/UniversalImage"
import { attrs, styled } from "library/styled"
import type { ComponentType, ReactNode } from "react"
import { defineField, type ImageOptions, type ImageRule } from "sanity"

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

export const imageWithAlt = (
	// sanity type is complicated here, so just add things as needed
	schemaField: {
		name: string
		title?: string
		description?: string
		validation?: (rule: ImageRule) => ImageRule
		options?: ImageOptions
		icon?: ReactNode | ComponentType
	},
) =>
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
