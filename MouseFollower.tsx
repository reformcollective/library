import { useLatest } from "ahooks"
import gsap from "gsap/all"
import { type ReactNode, useRef } from "react"
import { useDeepCompareMemo } from "use-deep-compare"
import { useClientOnly } from "./ClientOnly"
import { useLoadState } from "./link/useLoadState"
import { subscribeToMousePosition } from "./mouse-position"
import { useIsSmooth } from "./Scroll"
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
	const isUsingMouse = useClientOnly(useIsSmooth(), false)

	useAnimation(
		({ contextSafe }) => {
			const follower = followerRef.current
			const actualTargetElement = hoverTargetRef?.current || document.body
			if (!follower || !actualTargetElement) return
			if (entering) return
			if (!isUsingMouse) return

			let followerState: "visible" | "hidden" = "hidden"
			let lastTween: gsap.core.Tween | null = null

			gsap.set(follower, {
				xPercent: -50,
				yPercent: -50,
				scale: 0,
				autoAlpha: 0,
			})

			const xTo = gsap.quickTo(follower, "x", stableVars)
			const yTo = gsap.quickTo(follower, "y", stableVars)

			const showFollower = contextSafe(() => {
				const followerElement = followerRef.current
				if (!followerElement) return

				if (followerState === "visible") return
				followerState = "visible"
				onShowLatest.current?.()

				lastTween?.kill()
				lastTween = gsap.to(followerElement, {
					scale: 1,
					autoAlpha: 1,
					duration: SHOW_DURATION,
					ease: SHOW_EASE,
					delay: 0.1,
				})
			})

			const hideFollower = contextSafe(() => {
				const followerElement = followerRef.current
				if (!followerElement) return
				if (followerState === "hidden") return
				followerState = "hidden"
				onHideLatest.current?.()

				lastTween?.kill()
				lastTween = gsap.to(followerElement, {
					scale: 0,
					autoAlpha: 0,
					duration: HIDE_DURATION,
					ease: HIDE_EASE,
				})
			})

			const position = subscribeToMousePosition(
				({ clientX, clientY, isWithinElement }) => {
					const currentScale = gsap.getProperty(follower, "scale") as number
					if (currentScale < 0.01) {
						// if our scale is effectively 0, instantly update the position instead of animating
						xTo(clientX, clientX)
						yTo(clientY, clientY)
					} else {
						xTo(clientX)
						yTo(clientY)
					}

					if (isWithinElement) showFollower()
					else hideFollower()
				},
				hoverTargetRef?.current,
			)

			return () => {
				position.unsubscribe()
			}
		},
		[
			isUsingMouse,
			hoverTargetRef,
			stableVars,
			onHideLatest,
			onShowLatest,
			entering,
		],
	)

	return <Wrapper ref={followerRef}>{children}</Wrapper>
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
