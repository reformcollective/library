import type { TransitionNames } from "libraryConfig"

/**
 * config schema and config defaults for the reform util library
 * see src/libraryConfig.ts for the actual config
 */

export type Config = {
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
   * the default transition to use if none is specified
   */
  defaultTransition: TransitionNames
}

export const defaultConfig = {
  scaleFully: false,
  getTimeNeeded: (startTime: number) => startTime * 2 + 1000,
} as const satisfies Partial<Config>
