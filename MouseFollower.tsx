"use client"

import gsap from "gsap/all"
import { type ReactNode, useRef } from "react"
import { styled } from "./styled"
import { useAnimation } from "./useAnimation"

// Default animation values
const DEFAULT_QUICK_TO_DURATION = 0.4
const DEFAULT_QUICK_TO_EASE = "power2.out"
const SHOW_DURATION = 0.3
const SHOW_EASE = "back.out(1.7)"
const HIDE_DURATION = 0.2
const HIDE_EASE = "power3.in"

export const MouseFollower = ({
	children,
	hoverTargetRef,
}: {
	children: ReactNode
	hoverTargetRef?: React.RefObject<HTMLElement | null>
}) => {
	const followerRef = useRef<HTMLDivElement | null>(null)
	const mouseMoved = useRef(Promise.withResolvers<void>())

	// --- Hook 1: Mouse Tracking (gsap.quickTo) ---
	useAnimation(() => {
		const follower = followerRef.current
		if (!follower) return

		const xTo = gsap.quickTo(follower, "x", {
			duration: DEFAULT_QUICK_TO_DURATION,
			ease: DEFAULT_QUICK_TO_EASE,
		})
		const yTo = gsap.quickTo(follower, "y", {
			duration: DEFAULT_QUICK_TO_DURATION,
			ease: DEFAULT_QUICK_TO_EASE,
		})

		const onMouseMove = (event: MouseEvent) => {
			const { clientX, clientY } = event
			if (!follower) return

			mouseMoved.current.resolve()

			const currentScale = gsap.getProperty(follower, "scale") as number
			if (currentScale < 0.01) {
				// if our scale is effectively 0, instantly update the position instead of animating
				xTo(clientX, clientX)
				yTo(clientY, clientY)
			} else {
				xTo(clientX)
				yTo(clientY)
			}
		}

		window.addEventListener("mousemove", onMouseMove)
		return () => {
			window.removeEventListener("mousemove", onMouseMove)
		}
	}, [])

	// --- Hook 2: Visibility Control & Event Listeners ---
	useAnimation(() => {
		const followerElement = followerRef.current
		if (!followerElement) return

		// Determine the actual hover target: specific ref or document.body
		const actualTargetElement = hoverTargetRef?.current || document.body

		const showFollower = () => {
			mouseMoved.current.promise.then(() => {
				gsap.to(followerElement, {
					scale: 1,
					opacity: 1,
					duration: SHOW_DURATION,
					ease: SHOW_EASE,
				})
			})
		}

		const hideFollower = () => {
			gsap.to(followerElement, {
				scale: 0,
				opacity: 0,
				duration: HIDE_DURATION,
				ease: HIDE_EASE,
			})
		}

		// Initial Setup: Always start hidden
		gsap.set(followerElement, {
			scale: 0,
			opacity: 0,
			x: window.innerWidth / 2,
			y: window.innerHeight / 2,
			xPercent: -50,
			yPercent: -50,
		})

		// Event listeners for the determined target (specific element or document.body)
		actualTargetElement.addEventListener("mouseenter", showFollower)
		actualTargetElement.addEventListener("mouseleave", hideFollower)

		// Global event listeners for robustness (window blur/focus, document leave/enter)
		const handleWindowBlurOrDocLeave = () => {
			hideFollower()
		}

		const handleWindowFocusOrDocEnter = () => {
			// Only auto-show if the target is document.body (always-on mode)
			// and it was previously hidden.
			if (actualTargetElement === document.body) {
				const currentScale = gsap.getProperty(
					followerElement,
					"scale",
				) as number
				if (currentScale < 0.01) {
					showFollower()
				}
			}
			// If actualTargetElement is a specific ref, its own 'mouseenter'
			// (already attached) is responsible for showing.
		}

		window.addEventListener("blur", handleWindowBlurOrDocLeave)
		document.documentElement.addEventListener(
			"mouseleave",
			handleWindowBlurOrDocLeave,
		)
		window.addEventListener("focus", handleWindowFocusOrDocEnter)
		document.documentElement.addEventListener(
			"mouseenter",
			handleWindowFocusOrDocEnter,
		)

		return () => {
			actualTargetElement.removeEventListener("mouseenter", showFollower)
			actualTargetElement.removeEventListener("mouseleave", hideFollower)

			window.removeEventListener("blur", handleWindowBlurOrDocLeave)
			document.documentElement.removeEventListener(
				"mouseleave",
				handleWindowBlurOrDocLeave,
			)
			window.removeEventListener("focus", handleWindowFocusOrDocEnter)
			document.documentElement.removeEventListener(
				"mouseenter",
				handleWindowFocusOrDocEnter,
			)
		}
	}, [hoverTargetRef])

	return <Wrapper ref={followerRef}>{children}</Wrapper>
}

const Wrapper = styled("div", {
	position: "fixed",
	top: 0,
	left: 0,
	transform: "translate(-50%, -50%)",
	pointerEvents: "none",
	willChange: "transform, opacity",
	opacity: 0,
	scale: 0,
	zIndex: 1000,
})
