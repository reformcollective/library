import type { StructureResolver } from "sanity/structure"

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const getStructure =
	(singletons: string[]): StructureResolver =>
	(S) => {
		const singletonItems = singletons.map((id) =>
			S.documentTypeListItems().find((item) => item.getId() === id),
		)

		const middleItems = ["media.tag", "assist.instruction.context"].map((id) =>
			S.documentTypeListItems().find((item) => item.getId() === id),
		)

		const bottomItems = S.documentTypeListItems().filter(
			(item) => !singletonItems.includes(item) && !middleItems.includes(item),
		)

		return S.list()
			.title("Blog")
			.items(
				[
					...singletonItems,
					S.divider(),
					...middleItems,
					S.divider(),
					...bottomItems,
				].filter(Boolean),
			)
	}
