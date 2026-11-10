declare module "@sanity/types" {
	interface ObjectOptions {
		/** Marks a video field as a background video: the Studio shows only its source and poster. Render it with `mode="background"`; a field-level `validation` replaces the type's background source check. */
		background?: boolean
	}
}

export {}
