import { gsap, Observer, ScrollTrigger } from "gsap/all"
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react"
import { addDebouncedEventListener } from "./functions"
import { horizontalLoop } from "./gsapHelpers/horizontalLoop"
import { useAnimation } from "./useAnimation"
import { styled, fresponsive, css } from "./styled"

gsap.registerPlugin(Observer)

export function InfiniteSideScroll({
	children,
	ArrowButton,
	BackArrowButton,
	className,
	marqueeSpeed = 0,
	reversed = false,
	disableDrag = false,
	scrollVelocity,
}: {
	children: React.ReactNode
	className?: string
	/**
	 * if specified, a button will be shown to scroll forward and backward by an item
	 */
	ArrowButton?: (props: { onClick?: VoidFunction }) => ReactNode
	/**
	 * if specified, a different button may be used for scrolling backwards (if you'd rather not use an auto-flipped button)
	 */
	BackArrowButton?: (props: { onClick?: VoidFunction }) => ReactNode
	/**
	 * speed of the marquee. 1 is about 100 pixels per second. 0 or undefined will disable marqueeing
	 */
	marqueeSpeed?: number
	/**
	 * if true, the marquee will move to the right instead of to the left
	 */
	reversed?: boolean
	/**
	 * if true, the marquee will not be draggable or scrollable manually (you can still use the buttons, if specified)
	 */
	disableDrag?: boolean
	/**
	 * if specified, will scrub based on vertical scroll velocity
	 * can also be negative to reverse the direction
	 *
	 * you can also pass a function, which will be called with the velocity and should return the scrub value
	 * (this is useful if you want to e.g. always scrub forward regardless of scroll direction)
	 */
	scrollVelocity?: number | ((velocity: number) => number)
}) {
	const rowRef = useRef<HTMLDivElement>(null)
	const [numberNeeded, setNumberNeeded] = useState(1)

	const { result: loop } = useAnimation(
		() => {
			if (!rowRef.current) return
			const draggable = !disableDrag

			// calculate the gap size between instances so that we can pad the marquee when it loops
			// doing the math properly here is a bit tricky, but gives us lots of flexibility in how we pad our marquee
			const childCount = rowRef.current.children.length / numberNeeded
			const firstLastChild = rowRef.current.children[childCount - 1]
			const secondFirstChild = rowRef.current.children[childCount]
			const gap =
				firstLastChild && secondFirstChild
					? // distance from right edge of first to left edge of second
						Math.abs(
							firstLastChild.getBoundingClientRect().right -
								secondFirstChild.getBoundingClientRect().left,
						)
					: 0

			const loop = horizontalLoop(rowRef.current.children, {
				draggable,
				paused: marqueeSpeed === 0,
				center: true,
				speed: marqueeSpeed === 0 ? 2 : marqueeSpeed,
				reversed,
				repeat: -1,
				// padding right should match the calculated gap
				paddingRight: gap,
			})

			// start centered
			if (marqueeSpeed === 0) {
				loop.toIndex(0)
				loop.timeScale(999)
				requestAnimationFrame(() => {
					loop.timeScale(1)
				})
			}

			if (scrollVelocity)
				ScrollTrigger.create({
					onUpdate: (self) => {
						const delta =
							typeof scrollVelocity === "function"
								? scrollVelocity(self.getVelocity())
								: self.getVelocity() * (scrollVelocity / 1000)
						loop.scrollBy(delta)
					},
				})

			// if we don't support dragging, we can stop here
			if (!draggable) return loop

			let tween: gsap.core.Tween | undefined

			const onWheel = (e: WheelEvent) => {
				if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
				if (loop.draggable.isDragging || loop.draggable.isThrowing) return

				e.preventDefault()
				tween?.kill()
				gsap.killTweensOf(loop)
				loop.scrollBy(e.deltaX)
			}

			/**
			 * we have to use a regular event listener because the Observer
			 * can't preventDefault on wheel events (which we need to prevent overscroll in safari)
			 */
			gsap.context(() => {
				const row = rowRef.current
				row?.addEventListener("wheel", onWheel)
				return () => {
					row?.removeEventListener("wheel", onWheel)
				}
			})

			/**
			 * stop detection is much easier on an Observer than a WheelEvent
			 * so we'll still use it for stop detection
			 */
			Observer.create({
				target: rowRef.current,
				type: "wheel",
				onStop: () => {
					if (marqueeSpeed && !reversed) loop.play()
					else if (marqueeSpeed && reversed) loop.reverse()
					else
						tween = loop.toIndex(loop.current(), {
							ease: "power3.inOut",
							duration: 1,
						})
				},
			})

			return loop
		},
		[marqueeSpeed, reversed, disableDrag, scrollVelocity, numberNeeded],
		{ recreateOnResize: true },
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
		<Wrapper className={className}>
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
		</Wrapper>
	)
}

const Wrapper = styled(
	"div",
	fresponsive(css`
		display: grid;
	`),
)

const Row = styled(
	"div",
	fresponsive(css`
		display: flex;
		width: 100%;
		overflow: hidden;

		> * {
			flex-shrink: 0;
		}
	`),
)

const TwoButtons = styled(
	"div",
	fresponsive(css`
		display: flex;
	`),
)

const OneButton = styled(
	TwoButtons,
	fresponsive(css`
		> *:first-child {
			scale: -1 1;
		}
	`),
)
