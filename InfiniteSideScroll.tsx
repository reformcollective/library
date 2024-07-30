import gsap from "gsap"
import Observer from "gsap/Observer"
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react"
import styled from "styled-components"
import { addDebouncedEventListener } from "./functions"
import { horizontalLoop } from "./gsapHelpers/horizontalLoop"
import useAnimation from "./useAnimation"

gsap.registerPlugin(Observer)

export function InfiniteSideScroll({
	children,
	ArrowButton,
	BackArrowButton,
	className,
	marqueeSpeed = 0,
	reversed,
}: {
	children: React.ReactNode
	ArrowButton?: (props: { onClick?: VoidFunction }) => ReactNode
	BackArrowButton?: (props: { onClick?: VoidFunction }) => ReactNode
	className?: string
	marqueeSpeed?: number
	reversed?: boolean
}) {
	const rowRef = useRef<HTMLDivElement>(null)
	const [numberNeeded, setNumberNeeded] = useState(1)

	const loop = useAnimation(
		() => {
			if (!rowRef.current) return

			const loop = horizontalLoop(rowRef.current.children, {
				draggable: true,
				paused: marqueeSpeed === 0,
				center: true,
				speed: marqueeSpeed === 0 ? 2 : marqueeSpeed,
				reversed,
				repeat: -1,
			})

			// start centered
			if (marqueeSpeed === 0) {
				loop.toIndex(0)
				loop.timeScale(999)
				requestAnimationFrame(() => {
					loop.timeScale(1)
				})
			}

			let tween: gsap.core.Tween | undefined
			Observer.create({
				target: rowRef.current,
				type: "wheel",
				onChange: (self) => {
					if (loop.draggable.isDragging || loop.draggable.isThrowing) return
					tween?.kill()
					loop.scrollBy(self.deltaX)
				},
				onStop: () => {
					if (marqueeSpeed) loop.play()
					else
						tween = loop.toIndex(loop.current(), {
							ease: "power3.inOut",
							duration: 1,
						})
				},
			})

			return loop
		},
		[marqueeSpeed, reversed],
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

	/**
	 * some logic to determine which buttons to show, and if we need to flip the back button
	 */
	const hasButtons = Boolean(ArrowButton || BackArrowButton)
	const hasTwoButtons = Boolean(ArrowButton && BackArrowButton)
	const BackButton = BackArrowButton || ArrowButton
	const ForwardButton = ArrowButton || BackArrowButton
	const ButtonWrapper = hasTwoButtons ? TwoButtons : OneButton

	return (
		<div className={className}>
			<Row ref={rowRef} className="track">
				{Array.from({ length: numberNeeded }, (_, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: only unique identifier is index
					<Fragment key={index}>{children}</Fragment>
				))}
			</Row>
			{hasButtons && (
				<ButtonWrapper className="buttons">
					{BackButton && (
						<BackButton
							onClick={() =>
								loop?.previous({
									duration: 1,
									ease: "power3.out",
								})
							}
						/>
					)}
					{ForwardButton && (
						<ForwardButton
							onClick={() =>
								loop?.next({
									duration: 1,
									ease: "power3.out",
								})
							}
						/>
					)}
				</ButtonWrapper>
			)}
		</div>
	)
}

const Row = styled.div`
	display: flex;
	width: 100%;
	max-width: 100vw;
	overflow: clip;

	> * {
		flex-shrink: 0;
	}
`

const TwoButtons = styled.div`
	display: flex;
`

const OneButton = styled(TwoButtons)`
	> *:first-child {
		scale: -1 1;
	}
`
