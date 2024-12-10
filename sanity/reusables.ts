import { defineField } from "sanity"

export const imageWithAlt = (name: string) =>
	defineField({
		type: "image",
		name,
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
