/**
 * This plugin contains all the logic for setting up the singletons
 */

import { type DocumentDefinition, definePlugin } from "sanity"
import type {
	ListItemBuilder,
	StructureBuilder,
	StructureResolver,
} from "sanity/structure"

export const singletonPlugin = definePlugin((types: string[]) => {
	return {
		name: "singletonPlugin",
		document: {
			// Hide 'Singletons (such as Settings)' from new document options
			// https://user-images.githubusercontent.com/81981/195728798-e0c6cf7e-d442-4e58-af3a-8cd99d7fcc28.png
			newDocumentOptions: (prev, { creationContext }) => {
				if (creationContext.type === "global") {
					return prev.filter(
						(templateItem) => !types.includes(templateItem.templateId),
					)
				}

				return prev
			},
			// Removes the "duplicate" action on the Singletons (such as Home)
			actions: (prev, { schemaType }) => {
				if (types.includes(schemaType)) {
					return prev.filter(({ action }) => action !== "duplicate")
				}

				return prev
			},
		},
	}
})

type GroupItem = {
	item: (S: StructureBuilder) => ListItemBuilder
	hiddenTypes: string[]
}

// The StructureResolver is how we're changing the DeskTool structure to linking to document (named Singleton)
// like how "Home" is handled.
export const pageStructure = (
	typeDefArray: DocumentDefinition[],
	groups?: GroupItem[],
): StructureResolver => {
	return (S) => {
		// Goes through all of the singletons that were provided and translates them into something the
		// Structure tool can understand
		const singletonItems = typeDefArray.map((typeDef) => {
			return S.listItem()
				.title(typeDef?.title ?? "Untitled")
				.icon(typeDef.icon)
				.child(
					S.editor()
						.id(typeDef.name)
						.schemaType(typeDef.name)
						.documentId(typeDef.name),
				)
		})

		const hiddenTypes = [
			...typeDefArray.map((s) => s.name),
			...(groups?.flatMap((g) => g.hiddenTypes) ?? []),
		]

		// The default root list items (except custom ones)
		const nonSingletonItems = S.documentTypeListItems().filter(
			(listItem) => !hiddenTypes.includes(listItem.getId() ?? ""),
		)
		const middleItems = ["media.tag", "assist.instruction.context"]
			.map((id) => nonSingletonItems.find((item) => item.getId() === id))
			.filter(Boolean)
		const hiddenItems = ["mux.videoAsset"].map((id) =>
			nonSingletonItems.find((item) => item.getId() === id),
		)

		const restOfItems = nonSingletonItems.filter(
			(item) => !middleItems.includes(item) && !hiddenItems.includes(item),
		)

		const groupItems = groups?.map((g) => g.item(S)) ?? []

		return S.list()
			.title("Content Types")
			.items([
				...singletonItems,
				...groupItems,
				S.divider(),
				...middleItems,
				S.divider(),
				...restOfItems,
			])
	}
}
