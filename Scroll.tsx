import { gsap } from "gsap"
import ScrollSmoother from "gsap/ScrollSmoother"
import { pageReady, pageUnmounted } from "library/pageReady"
import { useEffect, useRef, useState } from "react"
import { useDeepCompareMemo } from "use-deep-compare"
import { checkGSAP } from "./checkGSAP"
import { isBrowser } from "./deviceDetection"

type IgnoredOptions = "smoothTouch" | "ignoreMobileResize" | "effects"

interface ScrollProps {
	children: React.ReactNode
	/**
	 * by default we save compute on mobile by ignoring resize
	 * (triggers shouldn't depend on innerHeight anyway)
	 *
	 * if you want to enable mobile resize checks, set this to true
	 * add a class name if you need to style the scroll div
	 */
	mobileResize?: boolean
	className?: string
	options?: Omit<ScrollSmoother.Vars, IgnoredOptions>
}

/**
 * shorthand for pins, which selects "fixed" if scroller is off and "transform"
 * if scroller is on
 */
export const usePinType = () => {
	const isSmooth = useIsSmooth()
	return isSmooth ? "transform" : "fixed"
}

/**
 * returns true if ScrollSmoother is enabled
 */
export const useIsSmooth = () => {
	const [smooth, setSmooth] = useState(
		typeof window !== "undefined" &&
			window.matchMedia("(hover: hover)").matches,
	)

	useEffect(() => {
		const enableSmooth = () => {
			setSmooth(true)
		}
		const disableSmooth = () => {
			setSmooth(false)
			gsap.set("#smooth-content", { clearProps: "transform" })
		}

		window.addEventListener("wheel", enableSmooth, { passive: true })
		window.addEventListener("touchstart", disableSmooth, { passive: true })

		return () => {
			window.removeEventListener("wheel", enableSmooth)
			window.removeEventListener("touchstart", disableSmooth)
		}
	}, [])

	// if the device is mobile, set the initial value to false
	useEffect(() => {
		const hover = window.matchMedia("(hover: hover)")
		if (!hover.matches) {
			setSmooth(false)
		}
	}, [])

	// check for url flags
	if (isBrowser && window.location.search.includes("noSmooth")) return false
	if (isBrowser && window.location.search.includes("forceSmooth")) return true

	return smooth
}

/**
 * searches for and initializes smoother effects any time the component is rendered
 */
export const useSmootherEffects = () => {
	useEffect(() => {
		ScrollSmoother.get()?.effects("[data-speed], [data-lag]", {})
	})
}

export default function Scroll({
	children,
	mobileResize = false,
	className = "",
	options,
}: ScrollProps) {
	const isSmooth = useIsSmooth()
	const isPaused = useRef(true)
	const [refreshSignal, setRefreshSignal] = useState(0)
	const stableOptions = useDeepCompareMemo(() => options, [options])

	// sometimes the smoother gets paused during HMR, so its helpful to unpause it
	useEffect(() => {
		if (
			window.location.hostname === "localhost" &&
			performance.now() > 10_000
		) {
			isPaused.current = false
			ScrollSmoother.get()?.paused(false)
		}
	})

	/**
	 * create the smoother
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: refreshSignal is required to handle specific navigation cases
	useEffect(() => {
		const smoother = ScrollSmoother.create({
			...stableOptions,
			// initially use a low smooth level to mitigate scroll flash
			smooth: isSmooth ? 0.01 : 0,
			smoothTouch: isSmooth ? 0.01 : 0,
			ignoreMobileResize: !mobileResize,
			effects: true,
			onUpdate: (e) => {
				// if at the top, enable overscroll behavior (pull to refresh)
				const maxScroll = document.body.scrollHeight - window.innerHeight
				if (e.scrollTop() === 0 || maxScroll - e.scrollTop() < 100) {
					document.body.style.overscrollBehaviorY = "auto"
					document.documentElement.style.overscrollBehaviorY = "auto"
				} else {
					document.body.style.overscrollBehaviorY = "none"
					document.documentElement.style.overscrollBehaviorY = "none"
				}
				// always allow sideways overscroll (forward/back usually)
				document.body.style.overscrollBehaviorX = "auto"
				document.documentElement.style.overscrollBehaviorX = "auto"

				stableOptions?.onUpdate?.(e)
			},
		})

		setTimeout(() => {
			// persist paused state across re-renders
			smoother.paused(isPaused.current)
		}, 0)

		// to avoid flashing when smoother across re-renders, set the smooth level after a short delay
		const smoothLevel =
			typeof stableOptions?.smooth === "number" ? stableOptions.smooth : 1
		setTimeout(
			() => {
				smoother.smooth(isSmooth ? smoothLevel : 0)
			},
			(smoothLevel * 1000) / 2,
		)

		return () => {
			isPaused.current = smoother.paused()
			smoother.kill()
		}
	}, [isSmooth, mobileResize, refreshSignal])

	/**
	 * kill the smoother when back/forward buttons are pressed
	 */
	useEffect(() => {
		const killSmoother = () => {
			;(async () => {
				const smoother = ScrollSmoother.get()
				if (smoother) smoother.kill()
				await pageUnmounted()
				await pageReady()
				setRefreshSignal((s) => s + 1)
			})().catch(console.error)
		}

		window.addEventListener("popstate", killSmoother)
		return () => {
			window.removeEventListener("popstate", killSmoother)
		}
	}, [])

	return (
		<div className={className} id="smooth-wrapper">
			<div id="smooth-content">{children}</div>
		</div>
	)
}

checkGSAP()
