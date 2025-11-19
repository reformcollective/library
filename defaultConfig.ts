/**
 * config schema and config defaults for the reform util library
 * see app/libraryConfig.ts for the actual config
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
	 * styling system to use
	 */
	stylingSystem: "vanilla" | "restyle" | "both"
}

const defaultConfig = {
	scaleFully: false,
	scrollRestoration: true,
	saveAnchorNames: true,
	transitionNames: [],
	tabletBreakpoint: "tablet",
	pageSectionGroups: [],
	stylingSystem: "both",
} as const satisfies Config

export const defineLibraryConfig = <const TransitionNames, const GroupNames>(
	config: Partial<Config<TransitionNames, GroupNames>>,
): Config<TransitionNames, GroupNames> => ({
	...defaultConfig,
	...config,
})
