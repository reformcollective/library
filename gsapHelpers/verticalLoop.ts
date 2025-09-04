import {
	Draggable,
	gsap,
	InertiaPlugin,
	Observer,
	ScrollTrigger,
} from "gsap/all"

gsap.registerPlugin(Draggable, InertiaPlugin, Observer, ScrollTrigger)

/**
 * Options for configuring the verticalLoop animation.
 */
interface VerticalLoopConfig {
	/**
	 * Speed of the loop animation (in pixels per second).
	 * @default 1
	 */
	speed?: number

	/**
	 * Whether the timeline should start paused.
	 * @default false
	 */
	paused?: boolean

	/**
	 * Number of times the loop should repeat. Use -1 for infinite.
	 * @default -1
	 */
	repeat?: number

	/**
	 * Whether the loop should play in reverse.
	 * @default false
	 */
	reversed?: boolean

	/**
	 * Padding to add to the bottom of the loop container.
	 * @default 0
	 */
	paddingBottom?: number | string

	/**
	 * Snapping configuration for scroll/draggable.
	 * Can be a boolean, number, or custom function.
	 * @default true
	 */
	snap?: boolean | number | ((value: number) => number)

	/**
	 * Enable draggable support for the loop.
	 * @default false
	 */
	draggable?: boolean

	/**
	 * Center the loop on a specific element or boolean for parent container.
	 * @default false
	 */
	center?: boolean | Element

	/**
	 * Callback when the centered item changes.
	 */
	onChange?: (item: Element, index: number) => void

	/**
	 * Whether to visually expand the centered item.
	 * @default false
	 */
	expandCenter?: boolean
}

/**
 * GSAP timeline extended with vertical loop navigation and state helpers.
 */
export interface ExtendedTimeline extends gsap.core.Timeline {
	/**
	 * Go to the next item in the loop.
	 */
	next: (vars?: gsap.TweenVars) => gsap.core.Tween

	/**
	 * Go to the previous item in the loop.
	 */
	previous: (vars?: gsap.TweenVars) => gsap.core.Tween

	/**
	 * Scroll to a specific index in the loop.
	 */
	toIndex: (index: number, vars?: gsap.TweenVars) => gsap.core.Tween

	/**
	 * Get the current index in the loop.
	 */
	current: () => number

	/**
	 * Find the closest index to the current scroll position.
	 */
	closestIndex: (setCurrent?: boolean) => number

	/**
	 * Scroll the loop by a number of pixels.
	 */
	scrollBy: (pixels: number) => void

	/**
	 * Timeline times for each item.
	 */
	times: number[]

	/**
	 * Draggable instance if enabled.
	 */
	draggable?: Draggable

	/**
	 * Last progress value (optional).
	 */
	lastProgress?: number
}

/**
 * Creates a vertically looping GSAP timeline for a set of elements.
 *
 * Handles:
 * - Looping and snapping logic
 * - Centering and expansion of items
 * - Optional draggable and scroll support
 * - Responsive updates on resize
 *
 * @param items Elements to loop through (targets for GSAP)
 * @param config Configuration options for the loop
 * @returns An extended GSAP timeline with navigation helpers
 */
export function verticalLoop(
	items: gsap.TweenTarget,
	config: VerticalLoopConfig = {},
): ExtendedTimeline {
	let timeline: ExtendedTimeline | undefined
	const elements = gsap.utils.toArray(items) as HTMLElement[]

	if (elements.length === 0) {
		throw new Error("verticalLoop requires at least one element")
	}

	gsap.context(() => {
		const onChange = config.onChange
		const expandCenter = config.expandCenter ?? false
		let lastIndex = 0

		const baseTimeline = gsap.timeline({
			repeat: config.repeat,
			paused: config.paused,
			defaults: { ease: "none" },
			onReverseComplete: function (this: gsap.core.Timeline): void {
				this.totalTime(this.rawTime() + this.duration() * 100)
			},
		})

		const tl = baseTimeline as ExtendedTimeline

		const length = elements.length
		const firstElement = elements[0]
		if (!firstElement) {
			throw new Error("First element is undefined")
		}

		const startY = firstElement.offsetTop
		const times: number[] = new Array(length).fill(0)
		const heights: number[] = new Array(length).fill(0)
		const spaceBefore: number[] = new Array(length).fill(0)
		const yPercents: number[] = new Array(length).fill(0)
		let curIndex = 0
		let indexIsDirty = false
		const center = config.center
		const pixelsPerSecond = (config.speed ?? 1) * 100

		const createSnapFunction = (): ((value: number) => number) => {
			if (config.snap === false) {
				return (v: number): number => v
			}
			if (typeof config.snap === "function") {
				return config.snap
			}
			const snapValue =
				config.snap === true || config.snap === undefined ? 1 : config.snap
			return gsap.utils.snap(snapValue) as (value: number) => number
		}

		const snap = createSnapFunction()
		let timeOffset = 0

		const getContainer = (): HTMLElement => {
			if (center === true) {
				return (firstElement.parentElement as HTMLElement) ?? document.body
			}
			if (center instanceof HTMLElement) {
				return center
			}
			if (center) {
				const result = gsap.utils.toArray(center)[0]
				if (result instanceof HTMLElement) {
					return result
				}
			}
			return (firstElement.parentElement as HTMLElement) ?? document.body
		}

		const container = getContainer()

		let totalHeight = 0
		let timeWrap: (value: number) => number = (v: number): number => v

		const getTotalHeight = (): number => {
			const lastElement = elements[length - 1]
			if (!lastElement) return 0

			const scaleYProp = gsap.getProperty(lastElement, "scaleY")
			const scaleY = typeof scaleYProp === "number" ? scaleYProp : 1
			const paddingBottom =
				typeof config.paddingBottom === "string"
					? parseFloat(config.paddingBottom)
					: (config.paddingBottom ?? 0)

			return (
				lastElement.offsetTop +
				((yPercents[length - 1] ?? 0) / 100) * (heights[length - 1] ?? 0) -
				startY +
				(spaceBefore[0] ?? 0) +
				lastElement.offsetHeight * scaleY +
				paddingBottom
			)
		}

		const populateHeights = (): void => {
			let b1 = container.getBoundingClientRect()
			let b2: DOMRect

			elements.forEach((el, i) => {
				const heightProp = gsap.getProperty(el, "height", "px")
				const heightStr =
					typeof heightProp === "string" ? heightProp : String(heightProp)
				heights[i] = parseFloat(heightStr)

				const yProp = gsap.getProperty(el, "y", "px")
				const yStr = typeof yProp === "string" ? yProp : String(yProp)
				const y = parseFloat(yStr)

				const yPercentProp = gsap.getProperty(el, "yPercent")
				const yPercent = typeof yPercentProp === "number" ? yPercentProp : 0

				yPercents[i] = snap((y / heights[i]) * 100 + yPercent)
				b2 = el.getBoundingClientRect()
				spaceBefore[i] = b2.top - (i > 0 ? b1.bottom : b1.top)
				b1 = b2
			})

			gsap.set(elements, {
				yPercent: (i: number): number => yPercents[i] ?? 0,
			})
			totalHeight = getTotalHeight()
		}

		const populateOffsets = (): void => {
			timeOffset = center
				? (tl.duration() * (container.offsetHeight / 2)) / totalHeight
				: 0

			if (center) {
				times.forEach((_, i) => {
					const labelKey = `label${i}`
					const labelTime = tl.labels[labelKey]
					if (typeof labelTime === "number") {
						const height = heights[i] ?? 0
						times[i] = timeWrap(
							labelTime +
								(tl.duration() * height) / 2 / totalHeight -
								timeOffset,
						)
					}
				})
			}
		}

		const getClosest = (
			values: number[],
			value: number,
			wrap: number,
		): number => {
			let closest = Number.POSITIVE_INFINITY
			let index = 0

			for (let i = values.length - 1; i >= 0; i--) {
				const val = values[i]
				if (val === undefined) continue

				let d = Math.abs(val - value)
				if (d > wrap / 2) {
					d = wrap - d
				}
				if (d < closest) {
					closest = d
					index = i
				}
			}
			return index
		}

		const populateTimeline = (): void => {
			tl.clear()

			for (let i = 0; i < length; i++) {
				const item = elements[i]
				if (!item) continue

				const yPercent = yPercents[i] ?? 0
				const height = heights[i] ?? 0
				const space = spaceBefore[0] ?? 0
				const curY = (yPercent / 100) * height
				const distanceToStart = item.offsetTop + curY - startY + space

				const scaleYProp = gsap.getProperty(item, "scaleY")
				const scaleY = typeof scaleYProp === "number" ? scaleYProp : 1
				const distanceToLoop = distanceToStart + height * scaleY

				tl.to(
					item,
					{
						yPercent: snap(((curY - distanceToLoop) / height) * 100),
						duration: distanceToLoop / pixelsPerSecond,
					},
					0,
				)
					.fromTo(
						item,
						{
							yPercent: snap(
								((curY - distanceToLoop + totalHeight) / height) * 100,
							),
						},
						{
							yPercent: yPercent,
							duration:
								(curY - distanceToLoop + totalHeight - curY) / pixelsPerSecond,
							immediateRender: false,
						},
						distanceToLoop / pixelsPerSecond,
					)
					.add(`label${i}`, distanceToStart / pixelsPerSecond)

				times[i] = distanceToStart / pixelsPerSecond
			}
			timeWrap = gsap.utils.wrap(0, tl.duration()) as (value: number) => number
		}

		const refresh = (deep: boolean = false): void => {
			const progress = tl.progress()
			tl.progress(0, true)
			populateHeights()
			if (deep) {
				populateTimeline()
			}
			populateOffsets()

			if (deep && tl.draggable && tl.paused()) {
				const time = times[curIndex]
				if (typeof time === "number") {
					tl.time(time, true)
				}
			} else {
				tl.progress(progress, true)
			}
		}

		const onResize = (): void => {
			refresh(true)
		}

		const proxy = document.createElement("div")

		gsap.set(elements, { y: 0 })
		populateHeights()
		populateTimeline()
		populateOffsets()

		window.addEventListener("resize", onResize)

		const toIndex = (
			index: number,
			vars: gsap.TweenVars = {},
		): gsap.core.Tween => {
			if (Math.abs(index - curIndex) > length / 2) {
				index += index > curIndex ? -length : length
			}

			const newIndex = gsap.utils.wrap(0, length, index)
			let time = times[newIndex]

			if (typeof time !== "number") {
				return gsap.to({}, { duration: 0 })
			}

			if (time > tl.time() !== index > curIndex && index !== curIndex) {
				time += tl.duration() * (index > curIndex ? 1 : -1)
			}

			if (time < 0 || time > tl.duration()) {
				vars.modifiers = { time: timeWrap }
			}

			curIndex = newIndex
			vars.overwrite = true

			if (proxy) {
				gsap.killTweensOf(proxy)
			}

			if (vars.duration === 0) {
				tl.time(timeWrap(time))
				return gsap.to({}, { duration: 0 })
			}

			return tl.tweenTo(time, vars)
		}

		tl.eventCallback("onUpdate", (): void => {
			let closestIndex = -1
			let closestDistance = 1
			let closestPosition = 0.5

			elements.forEach((el, idx) => {
				const position = ScrollTrigger.positionInViewport(el, "center")
				const distanceFromCenter = Math.abs(position - 0.5)

				if (distanceFromCenter < closestDistance) {
					closestDistance = distanceFromCenter
					closestIndex = idx
					closestPosition = position
				}
			})

			elements.forEach((el, idx) => {
				const position = ScrollTrigger.positionInViewport(el, "center")

				el.style.transition = `color 0.2s ease, opacity 0.2s ease`

				if (expandCenter && position >= -0.5 && position <= 1.5) {
					const positionDiff = position - closestPosition

					const t = Math.max(0, 1 - closestDistance * 3)
					const expansionStrength = t * t * t * t * t

					const falloff = Math.exp(
						-Math.abs(positionDiff) * Math.abs(positionDiff) * 6,
					)

					const pushAmount =
						30 * expansionStrength * falloff * Math.sign(positionDiff)

					gsap.to(el, {
						translateY: pushAmount,
						force3D: true,
						duration: 0.3,
						ease: "power2.out",
						overwrite: "auto",
					})
				} else {
					gsap.to(el, {
						translateY: 0,
						force3D: true,
						duration: 0.3,
						ease: "power2.out",
						overwrite: "auto",
					})
				}

				if (idx === closestIndex) {
					const centeredness =
						closestDistance < 0.15
							? 1
							: Math.max(0, 1 - (closestDistance - 0.15) / 0.25)

					const opacity = 0.4 + 0.6 * centeredness
					const colorIntensity = 30 + 70 * centeredness

					el.style.color = `rgb(255 255 255 / ${colorIntensity}%)`
					el.style.opacity = String(opacity)

					if (centeredness > 0.9 && lastIndex !== idx) {
						lastIndex = idx
						if (onChange) {
							onChange(el, idx)
						}
					}
				} else {
					el.style.color = "rgb(255 255 255 / 30%)"
					el.style.opacity = "0.4"
				}
			})
		})

		tl.toIndex = toIndex
		tl.closestIndex = (setCurrent: boolean = false): number => {
			const index = getClosest(times, tl.time(), tl.duration())
			if (setCurrent) {
				curIndex = index
				indexIsDirty = false
			}
			return index
		}
		tl.current = (): number => (indexIsDirty ? tl.closestIndex(true) : curIndex)
		tl.next = (vars?: gsap.TweenVars): gsap.core.Tween =>
			toIndex(tl.current() + 1, vars ?? {})
		tl.previous = (vars?: gsap.TweenVars): gsap.core.Tween =>
			toIndex(tl.current() - 1, vars ?? {})
		tl.times = times
		tl.progress(1, true).progress(0, true)

		if (config.reversed) {
			const onReverseComplete = tl.vars.onReverseComplete
			if (typeof onReverseComplete === "function") {
				onReverseComplete.call(tl)
			}
			tl.reverse()
		}

		if (config.draggable && typeof Draggable === "function") {
			const wrap = gsap.utils.wrap(0, 1) as (value: number) => number
			let ratio = 1
			let startProgress = 0
			let draggable: Draggable | undefined
			let lastSnap = 0
			let initChangeY = 0
			let wasPlaying = false

			const align = (): void => {
				if (!draggable) return
				tl.progress(
					wrap(startProgress + (draggable.startY - draggable.y) * ratio),
				)
			}

			const syncIndex = (): void => {
				tl.closestIndex(true)
			}

			if (typeof InertiaPlugin === "undefined") {
				console.warn(
					"InertiaPlugin required for momentum-based scrolling and snapping.",
				)
			}

			const draggableInstances = Draggable.create(proxy, {
				trigger: container,
				type: "y",
				onPressInit: function (this: Draggable): void {
					const y = this.y
					gsap.killTweensOf(tl)
					wasPlaying = !tl.paused()
					tl.pause()
					startProgress = tl.progress()
					refresh()
					ratio = 1 / totalHeight
					initChangeY = startProgress / -ratio - y
					gsap.set(proxy, { y: startProgress / -ratio })
				},
				onDrag: align,
				onThrowUpdate: align,
				overshootTolerance: 0.3,
				inertia: true,
				resistance: 200,
				snap: !config.snap
					? undefined
					: function (this: Draggable, value: number): number {
							if (Math.abs(startProgress / -ratio - this.y) < 10) {
								return lastSnap + initChangeY
							}
							const time = -(value * ratio) * tl.duration()
							const wrappedTime = timeWrap(time)
							const snapTime =
								times[getClosest(times, wrappedTime, tl.duration())]

							if (typeof snapTime !== "number") {
								return lastSnap
							}

							let dif = snapTime - wrappedTime

							if (Math.abs(dif) > tl.duration() / 2) {
								dif += dif < 0 ? tl.duration() : -tl.duration()
							}

							lastSnap = (time + dif) / tl.duration() / -ratio
							return lastSnap
						},
				onRelease: function (this: Draggable): void {
					syncIndex()
					if (this.isThrowing) {
						indexIsDirty = true
					}
				},
				onThrowComplete: (): void => {
					syncIndex()
					if (wasPlaying) {
						gsap.delayedCall(0.2, () => tl.play())
					}
				},
			})

			if (draggableInstances.length > 0) {
				draggable = draggableInstances[0]
				tl.draggable = draggable
			}
		}

		tl.scrollBy = (pixels: number): void => {
			const wrap = gsap.utils.wrap(0, 1) as (value: number) => number
			const progress = wrap(tl.progress() + pixels / totalHeight)
			tl.progress(progress)
			tl.closestIndex(true)
		}

		let tween: gsap.core.Tween | undefined

		const onWheel = (e: WheelEvent): void => {
			if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
			if (tl.draggable?.isDragging || tl.draggable?.isThrowing) return

			e.preventDefault()
			e.stopPropagation()
			if (tween) {
				tween.kill()
			}
			gsap.killTweensOf(tl)

			const momentum = e.deltaY * 0.25
			tl.scrollBy(momentum)
		}

		const modalElement = (container.closest("[data-state]") ||
			container.closest('[role="dialog"]') ||
			container) as HTMLElement
		modalElement.addEventListener("wheel", onWheel, { passive: false })

		Observer.create({
			target: container,
			type: "wheel",
			onStop: (): void => {
				tween = tl.toIndex(tl.current(), {
					ease: "expo.inOut",
					duration: 8,
				})
			},
		})

		tl.closestIndex(true)
		lastIndex = curIndex
		if (onChange) {
			const initialElement = elements[curIndex]
			if (initialElement) {
				onChange(initialElement, curIndex)
			}
		}

		timeline = tl

		return (): void => {
			window.removeEventListener("resize", onResize)
			const modalElementCleanup = (container.closest("[data-state]") ||
				container.closest('[role="dialog"]') ||
				container) as HTMLElement
			modalElementCleanup.removeEventListener("wheel", onWheel)
		}
	})

	if (!timeline) {
		throw new Error("Failed to create timeline")
	}

	return timeline
}
