import { useEventListener } from "ahooks"
import { gsap } from "gsap"
import type { ReactNode, RefObject } from "react"
import { useEffect, useRef, useState } from "react"
import { useBetterThrottle } from "./useBetterThrottle"
import { css, styled, unresponsive } from "./styled"

const extractKey = (item: unknown): string => {
	if (Array.isArray(item) && item.every((i) => typeof i === "string")) {
		return item.join("")
	}

	if (
		typeof item === "object" &&
		item !== null &&
		"key" in item &&
		typeof item.key === "string"
	) {
		return item.key
	}
	if (typeof item === "object" && item !== null)
		throw new Error("Element passed to AutoAnimate must have a key!")
	return String(item)
}

/**
 * gets the size of an element, always rounding UP to the nearest pixel
 * the default algorithm will round up or down but we want to always round up
 * there is maybe a more elegant way to solve for this, but this works for now
 */
const getSize = (element: React.RefObject<HTMLElement>) => {
	if (!element.current) return { width: 0, height: 0 }

	// client size doesn't include borders, offset size and bounding rect do
	const offsetWidth = element.current?.offsetWidth
	const offsetHeight = element.current?.offsetHeight
	const bounds = element.current.getBoundingClientRect()
	const boundsWidth = bounds.width
	const boundsHeight = bounds.height

	// we prefer bounds because offset size is rounded which can cause text wrapping oddness
	// but bounds is affected by transforms, so we'll only use it if it's very close to offset size
	const canUseBounds =
		Math.round(boundsWidth) === offsetWidth &&
		Math.round(boundsHeight) === offsetHeight

	if (canUseBounds)
		return { width: Math.ceil(boundsWidth), height: Math.ceil(boundsHeight) }
	// if we must use bounds, increase width by 1 to mitigate wrapping issues in exchange for very minor sizing issues
	return { width: offsetWidth + 1, height: offsetHeight }
}

export default function AutoAnimate({
	children,
	duration = 1,
	skipFirstAnimation = true,
	parameters,
	fromParameters,
	toParameters,
	alignment = "start",
	className = "",
}: {
	/**
	 * A react element to display. We'll smoothly animate this into view when its key changes
	 */
	children: ReactNode
	/**
	 * How long should this animation take? in seconds
	 * @default 1
	 */
	duration?: number
	/**
	 * when the component first mounts, should we immediately animate in, or should we wait for the first key change?
	 * if true, we'll wait for the first key change
	 * @default true
	 */
	skipFirstAnimation?: boolean
	/**
	 * Any additional parameters to pass to both GSAP tweens
	 */
	parameters?: Omit<GSAPTweenVars, "duration">
	/**
	 * Any additional parameters to pass to the tween that animates new content in
	 */
	fromParameters?: GSAPTweenVars
	/**
	 * Any additional parameters to pass to the tween that animates old content out
	 */
	toParameters?: GSAPTweenVars
	/**
	 * if the size changes, how should we align the content?
	 *
	 * if centered, content will overflow on the left and right during the animation.
	 * this is ideal when the container itself is centered
	 *
	 * if left, content will only overflow on the right during the animation.
	 * this is ideal when the container itself is left-aligned
	 * @default start
	 */
	alignment?: "start" | "center" | "end"
	/**
	 * if you need to style this, you can. be careful though. be very careful.
	 */
	className?: string
}) {
	const wrapperA = useRef<HTMLDivElement | null>(null)
	const wrapperB = useRef<HTMLDivElement | null>(null)
	const sizer = useRef<HTMLDivElement | null>(null)
	const wrapper = useRef<HTMLDivElement | null>(null)
	const isFirstRender = useRef(true)

	/**
	 * we always want to pass children through directly (so that what's rendered is always accurate)
	 * but we also want to separate based on keys
	 * so we'll keep track of the latest UI for each key, and render based on the key
	 */
	const childKey = extractKey(children)
	const keyBasedCache = useRef<Record<string, ReactNode>>({})
	keyBasedCache.current[childKey] = children
	const currentKey = useBetterThrottle(childKey, duration * 1000 + 100)

	const getNodeFromKey = (key: string | null) => {
		if (key === null) return null
		return keyBasedCache.current[key] ?? null
	}

	/**
	 * to prevent flickering, we alternate between two 'slots'
	 */
	const lastUsedSlot = useRef<"A" | "B">("A")
	const [slotA, setSlotA] = useState<string | null>(
		skipFirstAnimation ? childKey : null,
	)
	const [slotB, setSlotB] = useState<string | null>(null)

	// biome-ignore lint/correctness/useExhaustiveDependencies: we very specifically control when this effect runs
	useEffect(() => {
		if (!sizer.current || !wrapper.current) return

		/**
		 * calculate the size of the new content
		 * animate the container to that size
		 */
		sizer.current.style.display = "block"
		wrapper.current.style.display = "none"
		const size = getSize(sizer)
		sizer.current.style.display = "none"
		wrapper.current.style.display = "grid"

		/**
		 * if the height hasn't changed, don't touch it!
		 * changing the height to or from 'auto' can cause the smoother to refresh, even if the size hasn't changed
		 * this is a) bad for performance and b) can cause the smoother to jump visually (at least in gsap 3.12.5)
		 */
		const heightChanged = size.height !== getSize(wrapper).height
		gsap.set(wrapper.current, {
			height: heightChanged ? undefined : "auto",
		})

		gsap.to(wrapper.current, {
			width: size.width,
			height: heightChanged ? size.height : undefined,
			ease: parameters?.ease ?? "power3.inOut",
			duration: isFirstRender.current ? 0 : duration,

			/**
			 * we only want to set the size during a transition
			 * at any other time, we want the size to be auto
			 */
			onComplete: () => {
				gsap.set(wrapper.current, {
					height: "auto",
					width: "auto",
					// this needs to happen on the *next* frame, otherwise the height will briefly be wrong
					delay: 0.0001,
				})
			},
		})

		/**
		 * ensure that we have a static size to animate from during the next transition
		 */
		const cleanup = () => {
			gsap.set(wrapper.current, getSize(wrapper))
		}

		/**
		 * skip the next animation if applicable
		 */
		if (isFirstRender.current) {
			isFirstRender.current = false
			if (skipFirstAnimation) return cleanup
		}

		let animateSlotIn: RefObject<HTMLDivElement> | undefined
		let animateSlotOut: RefObject<HTMLDivElement> | undefined

		/**
		 * animate each slot to it's next position
		 */
		if (lastUsedSlot.current === "A") {
			lastUsedSlot.current = "B"
			setSlotB(currentKey)
			animateSlotIn = wrapperB
			animateSlotOut = wrapperA
		} else {
			lastUsedSlot.current = "A"
			setSlotA(currentKey)
			animateSlotIn = wrapperA
			animateSlotOut = wrapperB
		}

		gsap.set([wrapperA.current, wrapperB.current], {
			clearProps: "all",
		})

		// set the width of the slots to prevent text wrap from changing during the animation
		gsap.set(animateSlotOut.current, {
			width: getSize(animateSlotOut).width,
		})
		gsap.set(animateSlotIn.current, {
			width: size.width,
		})

		gsap.to(animateSlotOut.current, {
			yPercent: -100,
			ease: "power3.inOut",
			duration,
			onComplete: () => {
				gsap.set(animateSlotOut.current, {
					width: "auto",
					// this needs to happen on the *next* frame, otherwise the height will briefly be wrong
					delay: 0.0001,
				})

				/**
				 * clear the unused slot to prevent it from being focusable
				 */
				if (lastUsedSlot.current === "A") {
					setSlotB(null)
				} else {
					setSlotA(null)
				}
			},
			...parameters,
			...toParameters,
		})
		gsap.from(animateSlotIn.current, {
			yPercent: 100,
			ease: "power3.inOut",
			duration,
			...parameters,
			...fromParameters,
			onComplete: () => {
				gsap.set(animateSlotIn.current, {
					width: "auto",
					// this needs to happen on the *next* frame, otherwise the height will briefly be wrong
					delay: 0.0001,
				})
			},
		})

		return cleanup
	}, [currentKey])

	/**
	 * handle resize instantly
	 */
	useEventListener("resize", () => {
		if (!sizer.current || !wrapper.current) return

		for (const tween of gsap.getTweensOf(wrapper.current)) {
			tween.revert()
		}

		gsap.set(wrapper.current, {
			width: "auto",
			height: "auto",
		})
	})

	return (
		<Wrapper className={className}>
			<div ref={sizer}>{getNodeFromKey(currentKey)}</div>
			<AnimationWrapper ref={wrapper} alignment={alignment}>
				<div ref={wrapperA}>{getNodeFromKey(slotA)}</div>
				<div ref={wrapperB}>{getNodeFromKey(slotB)}</div>
			</AnimationWrapper>
		</Wrapper>
	)
}

const Wrapper = styled(
	"div",
	unresponsive(css`
		overflow: clip;
	`),
)

const AnimationWrapper = styled(
	"div",
	({ alignment }: { alignment: "start" | "center" | "end" }) =>
		unresponsive(css`
			display: grid;
			place-items: ${alignment};
			place-content: ${alignment};

			> * {
				grid-area: 1 / 1 / 2 / 2;
				min-width: 100%;
				min-height: 100%;
				display: grid;
				place-items: ${alignment};
				place-content: ${alignment};

				&:empty {
					pointer-events: none;
				}
			}
		`),
)
