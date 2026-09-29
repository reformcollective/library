import libraryConfig from "app/libraryConfig"
import { ScrollTrigger } from "gsap/all"
import { sleep } from "library/functions"
import { useEffect } from "react"
import { waitForPageCommit } from "./loader"
import { scrollPage } from "./util"

const nextFrame = () =>
	new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * restores the scroll position on back/forward navigation
 *
 * next applies a history restore asynchronously, so the browser restores scroll while
 * the page being left is still in the DOM and clamps to its height. we keep the
 * document tall for that restore, then re-apply where it landed once the right page commits.
 *
 * relies on `PageCommitSignal` being rendered on every page
 */
export const useScrollRestoration = () => {
	useEffect(() => {
		let pathname = window.location.pathname
		let popCount = 0

		const onPopState = async () => {
			popCount += 1
			const thisPop = popCount
			const pathnameChanged = window.location.pathname !== pathname
			pathname = window.location.pathname

			// the browser restores right after this event, so the old page must not clamp it
			document.documentElement.dataset.restoringScroll = ""
			await nextFrame()
			const y = libraryConfig.scrollRestoration ? window.scrollY : 0

			// pageCommit only fires when the pathname changes
			if (pathnameChanged)
				await Promise.race([waitForPageCommit(), sleep(1000)])
			if (thisPop !== popCount) return

			delete document.documentElement.dataset.restoringScroll
			// lenis still has the old page's limit cached, and scrollTo clamps to it
			window.lenisInstance?.resize()
			scrollPage({ y, instant: true })
			ScrollTrigger.refresh()

			await nextFrame()
			if (thisPop === popCount) scrollPage({ y, instant: true })
		}

		window.addEventListener("popstate", onPopState)
		return () => window.removeEventListener("popstate", onPopState)
	}, [])
}
