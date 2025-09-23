/**
 * config schema and config defaults for the reform util library
 * see app/libraryConfig.ts for the actual config
 */

type Config<TransitionNames = never> = {
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
	/**
	 * transition names, if applicable
	 */
	transitionNames: TransitionNames[]
	/**
	 * choose between a tablet breakpoint or a large mobile breakpoint
	 */
	tabletBreakpoint: "tablet" | "largeMobile"
}

const defaultConfig = {
	scaleFully: false,
	scrollRestoration: true,
	saveAnchorNames: true,
	transitionNames: [],
	tabletBreakpoint: "tablet",
} as const satisfies Config

export const defineLibraryConfig = <const TransitionNames>(
	config: Partial<Config<TransitionNames>>,
): Config<TransitionNames> => ({
	...defaultConfig,
	...config,
})
