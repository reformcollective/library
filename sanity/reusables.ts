import { defineField } from "sanity"

export const imageWithAlt = ({
	name,
	title,
}: {
	name: string
	title?: string
}) =>
	defineField({
		type: "image",
		name,
		title,
		fields: [
			defineField({
				type: "text",
				name: "alt",
				title: "Alternative text",
				rows: 2,
			}),
		],
		options: {
			aiAssist: {
				imageDescriptionField: "alt",
			},
		},
	})
