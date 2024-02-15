// *make sure to uncomment this after copying the default config*
// import defaultConfig from "library/defaultConfig"

/**
 * config for the reform util library
 * see src/library/defaultConfig.ts for the default config
 */

/**
 * The transition names that can be used in the page transition
 */
export type TransitionNames = "blue" | "fade" | "slide"

//* make sure to uncomment this after copying the default config *
// const config: typeof defaultConfig = {
const config = {
	// *make sure to uncomment this after copying the default config*
	// ...defaultConfig,
	/**
	 * if true, the fresponsive util will scale on fullWidth breakpoints
	 */
	scaleFully: false,
	/**
	 * get the amount of time needed to load the page
	 * @param startTime the number of MS the page spent loading on the network so far
	 */
	getTimeNeeded: (startTime: number) => startTime * 4 + 1000,
	/**
	 * the transition that will be used by default
	 */
	defaultTransition: "slide" satisfies TransitionNames as TransitionNames,
}

export default config
