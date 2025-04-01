import { useClientOnly } from "library/ClientOnly"
import { browserData } from "."

export const useBrowserData = (): typeof browserData => {
	return useClientOnly(browserData) ?? {}
}
