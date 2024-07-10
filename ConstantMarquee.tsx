import gsap from "gsap"
import React from "react"
import { useEffect, useRef, useState } from "react"
import styled from "styled-components"

import { addDebouncedEventListener } from "./functions"
import useAnimation from "./useAnimation"

interface MarqueeProps {
	children: React.ReactNode
	className?: string
	/**
	 * how many seconds should it take to loop once?
	 */
	timing?: number
	/**
	 * if true, reverses direction
	 */
	reversed?: boolean
	/**
	 * Manually pause the marquee
	 *
	 * Useful to control in cases where transforms are happening that could impact scrollTriggers
	 */
	paused?: boolean
	/**
	 * How much extra buffer (in pixels) should be maintained offscreen?
	 *
	 * useful for when you need a marquee wider than the screen (eg an animated one)
	 */
	buffer?: number
}

export default function ConstantMarquee({
	children,
	className,
	timing = 20,
	buffer = 0,
	reversed = false,
	paused = false,
}: MarqueeProps) {
	const marquee = useRef<HTMLDivElement>(null)
	const currWidth = useRef(0)
	const [array, setArray] = useState<null[]>([null])
	const offset = useRef(0)

	useAnimation(
		() => {
			if (!marquee.current || paused) return

			/**
			 * give each child an initial x position
			 */
			const first = marquee.current.children[0]
			const width = first?.clientWidth ?? 0
			offset.current = Math.min(0, offset.current)
			gsap.set(marquee.current.children, {
				x: (i) => i * width + offset.current,
			})

			/**
			 * animate each child on the x axis
			 */
			const tween = gsap.to(marquee.current.children, {
				duration: timing,
				ease: "none",
				x: reversed ? `+=${width}` : `-=${width}`,
				// when each child goes offscreen, move it to the other side
				modifiers: {
					x: gsap.utils.unitize((x: number) => {
						if (reversed) {
							if (x > width) {
								return x - width * array.length
							}
						} else {
							if (x < -width) {
								return x + width * array.length
							}
						}
						return x
					}),
				},
				onComplete: () => {
					tween.invalidate()
					tween.restart()
				},
			})

			return () => {
				// when we refresh, keep the position constant to minimize jumps
				if (first instanceof HTMLElement)
					offset.current = Number.parseInt(
						gsap.getProperty(first, "x").toString(),
						10,
					)
			}
		},
		[array, timing, reversed, paused],
		{
			kill: true,
			recreateOnResize: true,
		},
	)

	// biome-ignore lint/correctness/useExhaustiveDependencies: we want specific control of when this refreshes
	useEffect(() => {
		if (paused) return

		/**
		 * calculate how many children we need to fill the screen
		 */
		const update = () => {
			if (marquee.current) {
				const width = Math.max(
					...[...marquee.current.children].map((child) => child.clientWidth),
				)

				if (width !== currWidth.current) {
					// number needed to fill width plus some buffer
					const newNumber = Math.ceil((window.innerWidth + buffer) / width) + 1
					if (Number.isFinite(newNumber) && newNumber > 0)
						setArray(Array.from({ length: newNumber }, () => null))

					currWidth.current = width
				}
			}
		}

		update()

		// update when the marquee children change size
		const elementsToObserve = marquee.current?.querySelectorAll("*") ?? []
		const observer = new ResizeObserver(update)
		for (const element of elementsToObserve) {
			observer.observe(element)
		}

		// update when the screen size changes
		const remove = addDebouncedEventListener(window, "resize", update, 100)

		return () => {
			remove()
			observer.disconnect()
		}
	}, [buffer, children, paused])

	return (
		<StyledMarquee ref={marquee} $number={array.length} className={className}>
			{/* repeat children NUMBER times */}
			{array.map((_, index) => {
				// biome-ignore lint/suspicious/noArrayIndexKey: index is the only unique identifier here, since all children are identical
				return <div key={index}>{children}</div>
			})}
		</StyledMarquee>
	)
}

const StyledMarquee = styled.div<{ $number: number }>`
	position: relative;
	display: grid;
	grid-template-columns: repeat(${({ $number }) => $number}, max-content);

	/* always have a width of 100vw by default */
	width: 100%;
	left: 50%;
	translate: -50% 0;

	& > div {
		white-space: pre;
		will-change: transform;
		position: absolute;
	}

	& > div:first-child {
		position: relative;
	}
`
