"use server"

import { draftMode } from "next/headers"

export async function disableDraftMode() {
	"use server"
	const draft = await draftMode()
	draft.disable()

	// Simulate a delay to show the loading state
	await new Promise((resolve) => setTimeout(resolve, 1000))
}
