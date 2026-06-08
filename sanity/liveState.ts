import { defineField, defineType } from "sanity"

export const reformLiveStateType = defineType({
	name: "reformLiveState",
	title: "Reform Live State",
	type: "object",
	fields: [
		defineField({
			name: "processedThroughUpdatedAt",
			title: "Processed Through Updated At",
			type: "datetime",
			readOnly: true,
		}),
		defineField({
			name: "processedAt",
			title: "Processed At",
			type: "datetime",
			readOnly: true,
		}),
		defineField({
			name: "reason",
			title: "Reason",
			type: "string",
			readOnly: true,
		}),
	],
})
