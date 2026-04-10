let resolvePathChange: (() => void) | null = null

export const signalPathChanged = () => {
	resolvePathChange?.()
	resolvePathChange = null
}

export const waitForPathChange = () =>
	new Promise<void>((resolve) => {
		resolvePathChange = resolve
	})
