/**
 * config schema and config defaults for the reform util library
 * see app/libraryConfig.ts for the actual config
 */

type Config<TransitionName extends string> = {
	/**
	 * if true, the fresponsive util will scale on fullWidth breakpoints
	 */
	scaleFully: boolean
	/**
	 * get the amount of time needed to load the page
	 * @param startTime the number of MS the page spent loading on the network so far
	 */
	getTimeNeeded: (startTime: number) => number
	/**
	 * extra delay to add to preloader
	 */
	extraLoaderDelay: number
	/**
	 * list of available view transitions
	 */
	viewTransitions: Record<TransitionName, () => unknown>
	/**
	 * which transition should be used by default?
	 */
	defaultViewTransition: NoInfer<TransitionName> | "instant" | "default"
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
	defaultViewTransition: "instant",
	scaleFully: false,
	getTimeNeeded: (startTime: number) => startTime + 1000,
	scrollRestoration: true,
	saveAnchorNames: true,
	extraLoaderDelay: 0,
	viewTransitions: {},
} as const satisfies Config<never>

export const defineLibraryConfig = <SetConfig extends Partial<Config<string>>>(
	config: SetConfig,
) => ({
	...defaultConfig,
	...config,
})
