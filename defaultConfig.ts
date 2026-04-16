/**
 * config schema and config defaults for the reform util library
 * see libraryConfig.ts for the actual config
 */

type Config<TransitionNames = never, GroupNames = never> = {
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
	/**
	 * page section group names for sanity studio, if applicable
	 * this is only used for autocomplete & checking during development
	 */
	pageSectionGroups: GroupNames[]
	/**
	 * for the vanilla extract styling system, which engine to use
	 * "calc" will wrap each px value in a calc() function that calculates the value based on breakpoints
	 * "media" will wrap entire statements in a media query based on breakpoints
	 */
	vanillaExtractEngine: "calc" | "media"
	/**
	 * if true, override any preloader resolvers that have already been registered
	 * in most cases you won't want to use this
	 */
	overridePreloaderResolvers?: boolean
}

const defaultConfig = {
	scaleFully: false,
	scrollRestoration: true,
	saveAnchorNames: true,
	transitionNames: [],
	tabletBreakpoint: "tablet",
	pageSectionGroups: [],
	vanillaExtractEngine: "calc",
	overridePreloaderResolvers: false,
} as const satisfies Config

export const defineLibraryConfig = <const TransitionNames, const GroupNames>(
	config: Partial<Config<TransitionNames, GroupNames>>,
): Config<TransitionNames, GroupNames> => ({
	...defaultConfig,
	...config,
})
