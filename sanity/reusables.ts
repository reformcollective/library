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
