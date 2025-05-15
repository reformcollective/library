"use client"

import gsap from "gsap/all"
import { type ReactNode, useRef } from "react"
import { useDeepCompareMemo } from "use-deep-compare"
import { styled } from "./styled"
import { useAnimation } from "./useAnimation"
import { useLatest } from "ahooks"
import { useLoadState } from "./link/useLoadState"

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
	animationVars = {
		duration: DEFAULT_QUICK_TO_DURATION,
		ease: DEFAULT_QUICK_TO_EASE,
	},
	onShow,
	onHide,
}: {
	children: ReactNode
	hoverTargetRef?: React.RefObject<HTMLElement | null>
	animationVars?: gsap.TweenVars
	onShow?: () => void
	onHide?: () => void
}) => {
	const followerRef = useRef<HTMLDivElement | null>(null)
	const stableVars = useDeepCompareMemo(() => animationVars, [animationVars])
	const onShowLatest = useLatest(onShow)
	const onHideLatest = useLatest(onHide)
	const { entering } = useLoadState()
	const isUsingMouse = useIsSmooth()

	useAnimation(() => {
		const follower = followerRef.current
		const actualTargetElement = hoverTargetRef?.current || document.body
		if (!follower || !actualTargetElement) return
		if (entering) return

		let targetRectRef: DOMRect | null = null
		const latestPosition = { clientX: 0, clientY: 0 }
		let followerState: "visible" | "hidden" = "hidden"
		const mouseMoved = Promise.withResolvers<void>()

		const xTo = gsap.quickTo(follower, "x", stableVars)
		const yTo = gsap.quickTo(follower, "y", stableVars)

		// Initial Setup: Always start hidden
		gsap.set(follower, {
			scale: 0,
			opacity: 0,
			x: window.innerWidth / 2,
			y: window.innerHeight / 2,
			xPercent: -50,
			yPercent: -50,
		})

		const showFollower = () => {
			const followerElement = followerRef.current
			if (!followerElement) return

			mouseMoved.promise.then(() => {
				if (followerState === "visible") return
				followerState = "visible"
				onShowLatest.current?.()

				gsap.to(followerElement, {
					scale: 1,
					opacity: 1,
					duration: SHOW_DURATION,
					ease: SHOW_EASE,
				})
			})
		}

		const hideFollower = () => {
			const followerElement = followerRef.current
			if (!followerElement) return
			if (followerState === "hidden") return
			followerState = "hidden"
			onHideLatest.current?.()

			gsap.to(followerElement, {
				scale: 0,
				opacity: 0,
				duration: HIDE_DURATION,
				ease: HIDE_EASE,
			})
		}

		// showing and hiding the follower
		gsap.context(() => {
			actualTargetElement.addEventListener("mouseenter", showFollower)
			actualTargetElement.addEventListener("mouseleave", hideFollower)
			return () => {
				actualTargetElement.removeEventListener("mouseenter", showFollower)
				actualTargetElement.removeEventListener("mouseleave", hideFollower)
			}
		})

		// track mouse movement
		gsap.context(() => {
			const onMouseMove = (event: MouseEvent) => {
				const { clientX, clientY } = event
				if (!follower) return

				mouseMoved.resolve()
				latestPosition.clientX = clientX
				latestPosition.clientY = clientY

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
		})

		// scroll handling (mostly for safari)
		gsap.context(() => {
			let lastScrollY = window.scrollY
			const onScroll = () => {
				const movedBy = window.scrollY - lastScrollY
				lastScrollY = window.scrollY

				if (!targetRectRef) return

				targetRectRef.y -= movedBy

				const isInBounds =
					latestPosition.clientX >= targetRectRef.left &&
					latestPosition.clientX <= targetRectRef.right &&
					latestPosition.clientY >= targetRectRef.top &&
					latestPosition.clientY <= targetRectRef.bottom

				if (!isInBounds) {
					hideFollower()
				} else {
					showFollower()
				}
			}
			window.addEventListener("scroll", onScroll)
			return () => {
				window.removeEventListener("scroll", onScroll)
			}
		})

		// update target rect on resize & enter viewport
		gsap.context(() => {
			const updateTargetRect = () => {
				targetRectRef = actualTargetElement.getBoundingClientRect()
			}
			updateTargetRect()

			const resizeObserver = new ResizeObserver(updateTargetRect)
			resizeObserver.observe(actualTargetElement)

			const intersectionObserver = new IntersectionObserver((entries) => {
				if (entries[0]?.isIntersecting) updateTargetRect()
			})
			intersectionObserver.observe(actualTargetElement)

			window.addEventListener("focus", updateTargetRect)

			return () => {
				resizeObserver.disconnect()
				intersectionObserver.disconnect()
				window.removeEventListener("focus", updateTargetRect)
			}
		})
	}, [hoverTargetRef, stableVars, onHideLatest, onShowLatest, entering])

	return <Wrapper ref={followerRef}>{isUsingMouse ? children : null}</Wrapper>
}

const Wrapper = styled("div", {
	position: "fixed",
	top: 0,
	left: 0,
	transform: "translate(-50%, -50%)",
	willChange: "transform, opacity",
	zIndex: 1000,
	pointerEvents: "none",
	scale: 0,
	opacity: 0,

	"@media (hover:none)": {
		visibility: "hidden",
	},
})
