import { useEventListener } from "ahooks"
import { gsap } from "gsap"
import type { ReactNode, RefObject } from "react"
import { useEffect, useRef, useState } from "react"
import styled from "styled-components"
import { useBetterThrottle } from "./useBetterThrottle"

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

export default function AutoAnimate({
	children,
	duration = 1,
	skipFirstAnimation = true,
	parameters,
	fromParameters,
	toParameters,
	alignment = "start",
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
}) {
	const nextValue = useBetterThrottle(children, duration * 1000 + 100)

	const wrapperA = useRef<HTMLDivElement | null>(null)
	const wrapperB = useRef<HTMLDivElement | null>(null)
	const sizer = useRef<HTMLDivElement | null>(null)
	const wrapper = useRef<HTMLDivElement | null>(null)

	const lastUsedSlot = useRef<"A" | "B">("A")
	const [slotA, setSlotA] = useState<ReactNode>(
		skipFirstAnimation ? children : undefined,
	)
	const [slotB, setSlotB] = useState<ReactNode>()

	const isFirstRender = useRef(true)

	// biome-ignore lint/correctness/useExhaustiveDependencies: we very specifically control when this effect runs
	useEffect(() => {
		if (!sizer.current || !wrapper.current) return

		/**
		 * calculate the size of the new content
		 * animate the container to that size
		 */
		sizer.current.style.display = "block"
		wrapper.current.style.display = "none"
		const size = sizer.current.getBoundingClientRect()
		sizer.current.style.display = "none"
		wrapper.current.style.display = "grid"

		gsap.to(wrapper.current, {
			width: size.width,
			height: size.height,
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
			gsap.set(wrapper.current, {
				height: wrapper.current?.clientHeight ?? "auto",
				width: wrapper.current?.clientWidth ?? "auto",
			})
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
			setSlotB(nextValue)
			animateSlotIn = wrapperB
			animateSlotOut = wrapperA
		} else {
			lastUsedSlot.current = "A"
			setSlotA(nextValue)
			animateSlotIn = wrapperA
			animateSlotOut = wrapperB
		}

		gsap.set([wrapperA.current, wrapperB.current], {
			clearProps: "all",
		})

		gsap.to(animateSlotOut.current, {
			yPercent: -100,
			ease: "power3.inOut",
			duration,
			onComplete: () => {
				/**
				 * clear the unused slot to prevent it from being focusable
				 */
				if (lastUsedSlot.current === "A") {
					setSlotB(undefined)
				} else {
					setSlotA(undefined)
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
		})

		return cleanup
	}, [extractKey(nextValue)])

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
		<>
			<div ref={sizer}>{nextValue}</div>
			<Wrapper ref={wrapper} alignment={alignment}>
				<div ref={wrapperA}>{slotA}</div>
				<div ref={wrapperB}>{slotB}</div>
			</Wrapper>
		</>
	)
}

const Wrapper = styled.div<{
	alignment: "start" | "center" | "end"
}>`
  overflow: clip;
  display: grid;
  align-items: ${(props) => props.alignment};
  justify-content: ${(props) => props.alignment};
  margin: -0.1em;
  padding: 0.1em;

  > * {
    grid-area: 1 / 1 / 2 / 2;
    min-width: 100%;
    min-height: 100%;
    display: grid;
    align-items: ${(props) => props.alignment};
    justify-content: ${(props) => props.alignment};

    &:empty {
      pointer-events: none;
    }
  }
`
