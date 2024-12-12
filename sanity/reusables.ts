import {
	BlockquoteIcon,
	DocumentIcon,
	DoubleChevronDownIcon,
	DoubleChevronUpIcon,
	ImageIcon,
} from "@sanity/icons"
import { defineField } from "sanity"

export const imageWithAlt = ({
	name,
	required,
	title,
}: {
	name: string
	title?: string
	required?: boolean
}) =>
	defineField({
		type: "image",
		name,
		title,
		validation: required ? (rule) => rule.required() : undefined,
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
			},
			hotspot: true,
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
			{ type: "break" },
			{ type: "youtube" },
		],
	})
