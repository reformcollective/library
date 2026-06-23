import { ScrollTrigger } from "gsap/all"
import { createScrollLock, refreshScrollLocks } from "library/Scroll"

export const scrollPage = ({ y, instant }: { y: number; instant: boolean }) => {
	const unlock = createScrollLock("unlock")
	setTimeout(
		() => {
			unlock.release()
		},
		instant ? 0 : 1500,
	)

	if (!window.lenisInstance) {
		window.scrollTo({
			top: y,
			behavior: instant ? "instant" : "smooth",
		})
		return
	}

	window.lenisInstance.scrollTo(y, {
		immediate: instant,
		force: true,
		onComplete: () => {
			unlock.release()
		},
		lock: true,
	})
}

/**
 * returns the scroll offset of a given anchor by extracting it from the anchor element
 * this allows fine-tuning of the anchor scroll position
 */
export const getAnchorScrollPosition = (anchor: string) => {
	if (!anchor) return 0
	const anchorEl = document.querySelector(anchor)
	if (!anchorEl) return 0

	const trigger = ScrollTrigger.create({
		trigger: anchorEl,
		/* note: to avoid visible CLS, data-anchor-offset only affects page load if there is a preloader */
		start: anchorEl?.getAttribute("data-anchor-offset") || "top top",
	})

	const absoluteStart = trigger.start
	trigger.kill()

	const cssOffset = Number.parseFloat(getComputedStyle(anchorEl).scrollMarginTop)

	const final = absoluteStart - cssOffset
	return Number.isFinite(final) ? final : 0
}

/**
 * scroll to a given anchor until the scroll position stops changing
 */
export const instantScrollToAnchor = async (anchor: string) => {
	let scrollPosition = 0
	let goodAttemptCount = 0
	let missingAnchorCount = 0

	const attemptsNeeded = 20

	return new Promise<void>((resolve) => {
		const check = () => {
			const anchorEl = document.querySelector(anchor)
			if (!anchorEl) {
				missingAnchorCount += 1
				if (missingAnchorCount > attemptsNeeded) resolve()
				requestAnimationFrame(check)
				return
			}

			const anchorPosition = getAnchorScrollPosition(anchor)
			ScrollTrigger.refresh()
			scrollPage({ y: anchorPosition, instant: true })
			const newPosition = window.scrollY
			const isAtLeastClose = Math.abs(anchorPosition - scrollY) < 25

			// if we moved less than 10 pixels, count it as a good attempt
			// otherwise reset the counter
			if (isAtLeastClose && Math.abs(newPosition - scrollPosition) < 10) {
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
	})
}
