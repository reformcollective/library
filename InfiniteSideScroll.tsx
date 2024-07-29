import Observer from "gsap/Observer"
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react"
import styled from "styled-components"
import { addDebouncedEventListener } from "./functions"
import { horizontalLoop } from "./gsapHelpers/horizontalLoop"
import useAnimation from "./useAnimation"

export function InfiniteSideScroll({
	children,
	ArrowButton,
	className,
}: {
	children: React.ReactNode
	ArrowButton?: (props: { onClick?: VoidFunction }) => ReactNode
	className?: string
}) {
	const rowRef = useRef<HTMLDivElement>(null)
	const [numberNeeded, setNumberNeeded] = useState(1)

	const loop = useAnimation(
		() => {
			if (!rowRef.current) return

			const loop = horizontalLoop(rowRef.current.children, {
				draggable: true,
				paused: true,
				center: true,
				speed: 2,
			})

			// start centered
			loop.toIndex(0)
			loop.timeScale(999)
			requestAnimationFrame(() => {
				loop.timeScale(1)
			})

			let tween: gsap.core.Tween | undefined
			Observer.create({
				target: ".cards",
				type: "wheel",
				onChange: (self) => {
					tween?.kill()

					// seek the loop based on the wheel delta
					loop.seek(loop.time() + self.deltaX * 0.01)

					if (loop.progress() === 0) loop.progress(0.999)
					if (loop.progress() === 1) loop.progress(0.001)

					loop.closestIndex(true)
				},
				onStop: () => {
					tween = loop.toIndex(loop.current(), {
						ease: "power3.inOut",
						duration: 1,
					})
				},
			})

			return loop
		},
		[],
		{
			recreateOnResize: true,
			extraDeps: [numberNeeded],
		},
	)

	useEffect(() => {
		/**
		 * calculate how many children we need to fill the screen
		 */
		const update = () => {
			if (rowRef.current) {
				const totalChildrenWidth = Array.from(rowRef.current.children).reduce(
					(total, child) => total + child.clientWidth,
					0,
				)

				setNumberNeeded((oldNumber) => {
					const widthPerRepeat = totalChildrenWidth / oldNumber
					const newNumber = Math.ceil(window.innerWidth / widthPerRepeat) + 1
					return Number.isFinite(newNumber) && newNumber > 0
						? newNumber
						: oldNumber
				})
			}
		}

		update()

		// update when the marquee children change size
		const elementsToObserve = Array.from(
			rowRef.current?.querySelectorAll("*") ?? [],
		)
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
	}, [])

	return (
		<div className={className}>
			<Row ref={rowRef}>
				{Array.from({ length: numberNeeded }, (_, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: only unique identifier is index
					<Fragment key={index}>{children}</Fragment>
				))}
			</Row>
			{ArrowButton && (
				<Buttons>
					<ArrowButton
						onClick={() =>
							loop?.previous({
								duration: 1,
								ease: "power3.out",
							})
						}
					/>
					<ArrowButton
						onClick={() =>
							loop?.next({
								duration: 1,
								ease: "power3.out",
							})
						}
					/>
				</Buttons>
			)}
		</div>
	)
}

const Row = styled.div`
	display: flex;
	max-width: 100%;

	> * {
		flex-shrink: 0;
	}
`

const Buttons = styled.div`
	display: flex;

	> *:first-child {
		rotate: 180deg;
	}
`
