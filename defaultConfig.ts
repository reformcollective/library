/**
 * config schema and config defaults for the reform util library
 * see libraryConfig.ts for the actual config
 */

export type Breakpoint = "mobile" | "tablet" | "desktop" | "fullWidth"
export type DesignSize = "mobile" | "tablet" | "desktop"
export type UtilityOutput = "fluid" | "pixel" | "scaleFullyConfig"

export type BreakpointRule = {
	breakpoint: Breakpoint
	designSize: DesignSize
	output: UtilityOutput
}

export type UtilityConfig = Record<string, readonly BreakpointRule[]>

type Config<
	TransitionNames = never,
	GroupNames = never,
	Utilities extends UtilityConfig = Record<string, never>,
> = {
	/**
	 * if true, f.responsive will scale on fullWidth breakpoints
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
	/**
	 * additional responsive utilities to merge into the default f.* set
	 */
	utilities: Utilities
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
	utilities: {},
} as const satisfies Config

type ConfigInput<
	TransitionNames,
	GroupNames,
	Utilities extends UtilityConfig,
> = Partial<
	Omit<Config<TransitionNames, GroupNames, Utilities>, "utilities">
> & {
	utilities?: Utilities
}

export const defineLibraryConfig = <
	const TransitionNames,
	const GroupNames,
	const Utilities extends UtilityConfig = Record<string, never>,
>(
	config: ConfigInput<TransitionNames, GroupNames, Utilities>,
): Config<TransitionNames, GroupNames, Utilities> =>
	({
		...defaultConfig,
		...config,
		utilities: config.utilities ?? defaultConfig.utilities,
	}) as Config<TransitionNames, GroupNames, Utilities>
