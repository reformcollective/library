/**
 * config schema and config defaults for the reform util library
 * see app/libraryConfig.ts for the actual config
 */

type Config = {
	/**
	 * if true, the fresponsive util will scale on fullWidth breakpoints
	 */
	scaleFully: boolean
	/**
	 * should the page preserve the scroll position when reloading or when clicking back/forward
	 */
	scrollRestoration: boolean
	/**
	 * should anchor names be saved to the URL? when e.g. scrolling to a section
	 */
	saveAnchorNames: boolean
}

const defaultConfig = {
	scaleFully: false,
	scrollRestoration: true,
	saveAnchorNames: true,
} as const satisfies Config

export const defineLibraryConfig = <SetConfig extends Partial<Config>>(
	config: SetConfig,
) => ({
	...defaultConfig,
	...config,
})
