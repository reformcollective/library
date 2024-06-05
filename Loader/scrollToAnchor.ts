import ScrollSmoother from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { refreshScrollLocks } from "library/Scroll"
import libraryConfig from "libraryConfig"

/**
 * returns the scroll offset of a given anchor by extracting it from the anchor element
 * this allows fine-tuning of the anchor scroll position
 */
export const getScrollOffset = (anchor: string) => {
	let scrollOffset = 100

	if (anchor) {
		const anchorEl = document.querySelector(anchor)
		const anchorOffset = anchorEl?.getAttribute("data-anchor-offset")
		scrollOffset += Number.parseFloat(anchorOffset ?? "0")
	}

	return scrollOffset
}

/**
 * scroll to a given anchor until the scroll position stops changing
 */
export const scrollToAnchor = async (anchor: string) => {
	let scrollPosition = 0
	let goodAttemptCount = 0
	let missingAnchorCount = 0

	const attemptsNeeded = 20

	return new Promise<void>((resolve) => {
		const check = () => {
			const anchorEl = document.querySelector(anchor)
			if (!anchorEl) {
				missingAnchorCount += 1
				if (missingAnchorCount > 10) resolve()
				requestAnimationFrame(check)
				return
			}

			const scrollOffset = getScrollOffset(anchor)
			ScrollTrigger.refresh()
			// in order to properly scroll to the anchor, we need to unpause the smoother
			ScrollSmoother.get()?.paused(false)
			ScrollSmoother.get()?.scrollTo(anchor, false, `top: ${scrollOffset}px`)
			const newPosition = ScrollSmoother.get()?.scrollTop() ?? 0

			// if we moved less than 10 pixels, count it as a good attempt
			// otherwise reset the counter
			if (Math.abs(newPosition - scrollPosition) < 10) {
				goodAttemptCount += 1
			} else {
				scrollPosition = newPosition
				goodAttemptCount = 0
			}

			if (goodAttemptCount > attemptsNeeded) {
				requestAnimationFrame(() => resolve())
				requestAnimationFrame(refreshScrollLocks)
			} else {
				requestAnimationFrame(check)
			}
		}

		check()
	}).then(() => {
		// scrub the anchor from the URL if needed
		if (!libraryConfig.saveAnchorNames) {
			const newURL = new URL(window.location.href)
			newURL.hash = ""
			window.history.replaceState({}, "", newURL.toString())
		}
	})
}
