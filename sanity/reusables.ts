import {
	BlockquoteIcon,
	DocumentIcon,
	DoubleChevronDownIcon,
	DoubleChevronUpIcon,
	ImageIcon,
} from "@sanity/icons"
import UniversalImage, { type UniversalImageData } from "library/UniversalImage"
import { attrs, styled } from "library/styled"
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

export const portableText = ({
	name,
	title,
}: {
	name: string
	title?: string
}) =>
	defineField({
		name,
		type: "array",
		title,
		hidden: false,
		of: [
			{
				type: "block",
				styles: [
					{ title: "Normal", value: "normal" },
					{ title: "Heading 1", value: "h1" },
					{ title: "Heading 2", value: "h2" },
					{ title: "Heading 3", value: "h3" },
					{ title: "Heading 4", value: "h4" },
					{
						title: "Blockquote",
						value: "blockquote",
						icon: BlockquoteIcon,
					},
				],
				lists: [
					{ title: "Bullet", value: "bullet" },
					{ title: "Numbered", value: "number" },
				],

				marks: {
					decorators: [
						{ title: "Strong", value: "strong" },
						{ title: "Emphasis", value: "em" },
						{ title: "Code", value: "code" },
						{ title: "Underline", value: "underline" },
						{ title: "Strike", value: "strike-through" },
						{ title: "Super", value: "super", icon: DoubleChevronUpIcon },
						{ title: "Sub", value: "sub", icon: DoubleChevronDownIcon },
					],

					annotations: [
						{
							type: "object",
							name: "link",
							title: "url",
							fields: [
								defineField({
									type: "string",
									name: "href",
									title: "URL",
									validation: (Rule) => Rule.required(),
								}),
								defineField({
									type: "string",
									name: "target",
									title: "Target",
									options: {
										list: [
											{ value: "_blank", title: "Blank" },
											{ value: "_parent", title: "Parent" },
										],
									},
								}),
							],
						},
					],
				},
				options: {
					spellCheck: true,
					lineBreaks: true,
				},
			},
			{ type: "image", icon: ImageIcon },
			{ type: "file", icon: DocumentIcon },
			{ type: "youtube" },
		],
	})
