import { useDebounceFn } from "ahooks"
import { gsap, Observer, ScrollTrigger } from "gsap/all"
import { library } from "library/layers.css"
import { css, fresponsive, styled } from "library/styled/alpha"
import {
	Fragment,
	type ReactNode,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react"
import { horizontalLoop } from "./gsapHelpers/horizontalLoop"
import { verticalLoop } from "./gsapHelpers/VerticalLoop"
import { createDebouncedEventListener } from "./ScreenContext"
import { useAnimation } from "./useAnimation"
import { useCombinedRefs } from "./useCombinedRefs"

gsap.registerPlugin(Observer, ScrollTrigger)

export type MarqueeLoop =
	| ReturnType<typeof horizontalLoop>
	| ReturnType<typeof verticalLoop>

export function Marquee({
	children,
	ArrowButton,
	BackArrowButton,
	className,
	marqueeSpeed = 0,
	reversed = false,
	disableDrag = false,
	disableSnap = false,
	scrollVelocity,
	onChange,
	loopRef,
	centerMode = true,
	mode = "horizontal",
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
	 * if true, the marquee will move in the reverse direction
	 */
	reversed?: boolean
	/**
	 * if true, the marquee will not be draggable or scrollable manually (you can still use the buttons, if specified)
	 */
	disableDrag?: boolean
	/**
	 * if true, the marquee will not snap to the nearest index
	 */
	disableSnap?: boolean
	/**
	 * if specified, will scrub based on scroll velocity
	 * can also be negative to reverse the direction
	 *
	 * you can also pass a function, which will be called with the velocity and should return the scrub value
	 */
	scrollVelocity?: number | ((velocity: number) => number)
	/**
	 * fires when the marquee moves with the current index
	 */
	onChange?: (index: number) => void
	/**
	 * if you need to access the loop, to e.g. manually scroll to a certain index
	 */
	loopRef?: RefObject<MarqueeLoop | null>
	/**
	 * if true (default), the first item will be positioned in the center
	 */
	centerMode?: boolean
	/**
	 * "horizontal" (default) or "vertical"
	 */
	mode?: "horizontal" | "vertical"
}) {
	const rowRef = useRef<HTMLDivElement>(null)
	const internalLoopRef = useCombinedRefs(loopRef, undefined)
	const [numberNeeded, setNumberNeeded] = useState(1)
	const [refreshSignal, setRefreshSignal] = useState(0)

	const { run: debouncedRefresh } = useDebounceFn(
		() => setRefreshSignal((s) => s + 1),
		{ wait: 150 },
	)

	const latestOnChange = useRef(onChange)
	useLayoutEffect(() => {
		latestOnChange.current = onChange
	}, [onChange])

	const isVertical = mode === "vertical"

	const { result: loop } = useAnimation(
		() => {
			if (!rowRef.current) return
			const draggable = !disableDrag

			// calculate the gap size between instances so that we can pad the marquee when it loops
			const childCount = rowRef.current.children.length / numberNeeded
			const firstLastChild = rowRef.current.children[childCount - 1]
			const firstLastEdgeMargin = isVertical
				? Number(gsap.getProperty(firstLastChild ?? null, "marginBottom"))
				: Number(gsap.getProperty(firstLastChild ?? null, "marginRight"))
			const secondFirstChild = rowRef.current.children[childCount]
			const secondFirstEdgeMargin = isVertical
				? Number(gsap.getProperty(secondFirstChild ?? null, "marginTop"))
				: Number(gsap.getProperty(secondFirstChild ?? null, "marginLeft"))
			const gap =
				firstLastChild && secondFirstChild
					? isVertical
						? Math.abs(
								firstLastChild.getBoundingClientRect().bottom -
									secondFirstChild.getBoundingClientRect().top,
							) -
							firstLastEdgeMargin -
							secondFirstEdgeMargin
						: Math.abs(
								firstLastChild.getBoundingClientRect().right -
									secondFirstChild.getBoundingClientRect().left,
							) -
							firstLastEdgeMargin -
							secondFirstEdgeMargin
					: 0

			const loopConfig = {
				draggable,
				snap: disableSnap ? false : 1,
				paused: marqueeSpeed === 0,
				center: centerMode,
				speed: marqueeSpeed === 0 ? 2 : marqueeSpeed,
				reversed,
				repeat: -1,
				// external code manages teardown on width/height changes
				manageResize: false,
				onChange: (_: unknown, index: number) => {
					latestOnChange.current?.(index)
				},
			}

			const loop = isVertical
				? verticalLoop(rowRef.current.children, {
						...loopConfig,
						paddingBottom: gap,
					})
				: horizontalLoop(rowRef.current.children, {
						...loopConfig,
						paddingRight: gap,
					})

			internalLoopRef(loop)

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
				if (isVertical) {
					if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
				} else {
					if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
				}
				if (loop.draggable.isDragging || loop.draggable.isThrowing) return

				e.preventDefault()
				tween?.kill()
				gsap.killTweensOf(loop)
				loop.scrollBy(isVertical ? e.deltaY : e.deltaX)
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
		[
			marqueeSpeed,
			reversed,
			disableDrag,
			disableSnap,
			scrollVelocity,
			numberNeeded,
			internalLoopRef,
			centerMode,
			isVertical,
		],
		{
			recreateOnResize: true,
			extraDeps: [refreshSignal],
		},
	)

	useEffect(() => {
		/**
		 * calculate how many children we need to fill the screen
		 */
		const update = () => {
			if (rowRef.current) {
				const totalChildrenSize = Array.from(rowRef.current.children).reduce(
					(total, child) =>
						total + (isVertical ? child.clientHeight : child.clientWidth),
					0,
				)

				setNumberNeeded((oldNumber) => {
					const sizePerRepeat = totalChildrenSize / oldNumber
					const screenSize = isVertical ? window.innerHeight : window.innerWidth
					const newNumber = Math.ceil(screenSize / sizePerRepeat) + 1
					return Number.isFinite(newNumber) && newNumber > 0
						? newNumber
						: oldNumber
				})
			}
		}

		update()

		const elementsToObserve = Array.from(
			rowRef.current?.querySelectorAll("*") ?? [],
		)
		const observer = new ResizeObserver(() => {
			update()
			debouncedRefresh()
		})
		for (const element of elementsToObserve) {
			observer.observe(element)
		}

		const listener = createDebouncedEventListener("resize", update)

		return () => {
			listener.cleanup()
			observer.disconnect()
		}
	}, [debouncedRefresh, isVertical])

	const hasButtons = Boolean(ArrowButton || BackArrowButton)
	const hasTwoButtons = Boolean(ArrowButton && BackArrowButton)
	const BackButton = BackArrowButton || ArrowButton
	const ForwardButton = ArrowButton || BackArrowButton
	const ButtonWrapper = hasTwoButtons ? TwoButtons : OneButton

	return (
		<Wrapper className={className}>
			<Row
				ref={rowRef}
				className="track"
				data-vertical={isVertical || undefined}
			>
				{Array.from({ length: numberNeeded }, (_, index) => (
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

const Wrapper = styled("div", [
	{
		"@layer": {
			[library]: fresponsive(css`
				display: grid;
				position: relative;
			`),
		},
	},
])

const Row = styled("div", [
	{
		"@layer": {
			[library]: fresponsive(css`
				display: flex;
				width: 100%;
				overflow: hidden;

				& > * {
					flex-shrink: 0;
				}

				&[data-vertical] {
					flex-direction: column;
					width: auto;
					height: 100%;
				}
			`),
		},
	},
])

const TwoButtons = styled("div", [
	{
		"@layer": {
			[library]: fresponsive(css`
				display: flex;
			`),
		},
	},
])

const OneButton = styled(TwoButtons, [
	{
		"@layer": {
			[library]: fresponsive(css`
				& > *:first-child {
					scale: -1 1;
				}
			`),
		},
	},
])
