import { gsap } from "gsap"
import type { ReactNode, RefObject } from "react"
import { useEffect, useRef, useState } from "react"
import styled, { css } from "styled-components"
import { useBetterThrottle } from "./useBetterThrottle"

const extractKey = (item: unknown): string => {
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
	alignment = "left",
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
	 * @default left
	 */
	alignment?: "centered" | "left"
}) {
	const nextValue = useBetterThrottle(children, 1100)
	const lastUsedSlot = useRef<"A" | "B">("A")

	const wrapperA = useRef<HTMLDivElement | null>(null)
	const wrapperB = useRef<HTMLDivElement | null>(null)
	const [slotA, setSlotA] = useState<ReactNode>(
		skipFirstAnimation ? children : undefined,
	)
	const [slotB, setSlotB] = useState<ReactNode>()

	const firstRender = useRef(true)

	// biome-ignore lint/correctness/useExhaustiveDependencies: we very specifically control when this effect runs
	useEffect(() => {
		if (firstRender.current && skipFirstAnimation) {
			firstRender.current = false
			return
		}

		let animateSlotIn: RefObject<HTMLDivElement> | undefined
		let animateSlotOut: RefObject<HTMLDivElement> | undefined

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

		const parent = wrapperA.current?.parentElement
		if (parent) {
			setTimeout(() => {
				gsap.to(parent, {
					width: animateSlotIn.current?.offsetWidth,
					height: animateSlotIn.current?.offsetHeight,
					ease: "power3.inOut",
					duration,
				})
			})

			let previousWith = window.innerWidth
			const onResize = () => {
				if (window.innerWidth === previousWith) return
				previousWith = window.innerWidth
				gsap.killTweensOf([wrapperA.current, wrapperB.current, parent])
				gsap.set([wrapperA.current, wrapperB.current, parent], {
					clearProps: "all",
				})
				gsap.set(animateSlotOut.current, {
					yPercent: -100,
					...parameters,
					...toParameters,
				})
				gsap.set(parent, {
					width: animateSlotIn.current?.offsetWidth,
					height: animateSlotIn.current?.offsetHeight,
				})
			}

			window.addEventListener("resize", onResize)
			return () => window.removeEventListener("resize", onResize)
		}
	}, [duration, extractKey(nextValue), skipFirstAnimation])

	return (
		<Wrapper alignment={alignment}>
			<div ref={wrapperA}>{slotA}</div>
			<div ref={wrapperB}>{slotB}</div>
		</Wrapper>
	)
}

const Wrapper = styled.div<{
	alignment: "centered" | "left"
}>`
  overflow: hidden;
  position: relative;
  display: grid;
  grid-template: 1fr / 1fr;
  ${({ alignment }) =>
		alignment === "centered" &&
		css`
      justify-content: center;
      place-items: center;
    `}

  > * {
    grid-area: 1 / 1 / 2 / 2;
    display: grid;
    align-items: center;
    width: fit-content;
    height: fit-content;

    &:empty {
      pointer-events: none;
    }

    /* text very commonly overflows its bounds on the bottom in letters like g */
    padding-bottom: 0.1em;
  }
`
