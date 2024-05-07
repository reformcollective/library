import { useDeepCompareEffect } from "ahooks"
import gsap from "gsap"
import Flip from "gsap/Flip"
import {
	type ComponentProps,
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useState,
} from "react"
import { usePinType } from "./Scroll"
import createSmoothPin from "./smoothPin"
import useAnimation from "./useAnimation"

gsap.registerPlugin(Flip)

const Context = createContext<{
	fromEl: HTMLDivElement | null
	toEl: HTMLDivElement | null
	setFromEl: (el: HTMLDivElement | null) => void
	setToEl: (el: HTMLDivElement | null) => void
}>({
	fromEl: null,
	toEl: null,
	setFromEl: () => {
		throw new Error("You must wrap the entire section with ZoomPinProvider")
	},
	setToEl: () => {
		throw new Error("You must wrap the entire section with ZoomPinProvider")
	},
})

const useSize = (el?: HTMLDivElement | null) => {
	const [width, setWidth] = useState(el?.offsetWidth)
	const [height, setHeight] = useState(el?.offsetHeight)

	useEffect(() => {
		if (!el) return

		const observer = new ResizeObserver(() => {
			// sometimes applying a pin can change the size by a very small amount
			// usually that's fine, but in some very specific cases it can cause a loop because of rounding
			setWidth((p) =>
				// apply if undefined
				p === undefined ||
				// or if the difference is more than 1
				Math.abs((p ?? 0) - el.clientWidth) > 1
					? el.clientWidth
					: p,
			)
			setHeight((p) =>
				// apply if undefined
				p === undefined ||
				// or if the difference is more than 1
				Math.abs((p ?? 0) - el.clientHeight) > 1
					? el.clientHeight
					: p,
			)
		})

		observer.observe(el)

		return () => observer.disconnect()
	}, [el])

	return { width, height }
}

export const ZoomPinProvider = ({
	children,
	dependencies = [],
	options,
}: {
	children: ReactNode
	/**
	 * if you need to recreate the animation
	 * these work like useEffect dependencies
	 */
	dependencies?: unknown[]
	/**
	 * options for the flip animation and its scrolltrigger
	 */
	options?: Flip.FitVars
}) => {
	const [fromEl, setFromEl] = useState<HTMLDivElement | null>(null)
	const [toEl, setToEl] = useState<HTMLDivElement | null>(null)
	const fromSize = useSize(fromEl)
	const toSize = useSize(toEl)
	const pinType = usePinType()

	useAnimation(
		() => {
			if (!fromEl || !toEl) return
			gsap.set([fromEl, toEl], {
				clearProps: "transform",
				willChange: "transform",
			})

			/**
			 * capture the end state of the animation (where we want fromEl to end at)
			 */
			const topDiff =
				fromEl.getBoundingClientRect().top - toEl.getBoundingClientRect().top
			const heightDiff = (fromSize.height ?? 0) - (toSize.height ?? 0)
			gsap.set(toEl, {
				y: topDiff + heightDiff / 2,
			})
			const state = Flip.getState(toEl)

			/**
			 * fit fromEl onto toEl and animate to the end state
			 */
			Flip.fit(toEl, fromEl, {
				scale: true,
			})
			Flip.fit(toEl, state, {
				scale: true,
				duration: 1,
				...options,
				scrollTrigger: {
					trigger: fromEl,
					start: "center center",
					endTrigger: toEl.parentElement,
					end: "center center",
					scrub: true,
					...(options?.scrollTrigger ?? {}),
				},
			})

			/**
			 * and pin toEl for the needed duration
			 * this is separate so that we can customize the start and end of the animation without affecting the pin
			 */
			createSmoothPin({
				trigger: fromEl,
				start: "center center",
				endTrigger: toEl.parentElement,
				end: "center center",
				pinType,
				pin: toEl.parentElement,
				pinSpacing: false,
				smoothLevel: Math.min(200, Math.abs(heightDiff) / 4),
			})
		},
		[fromEl, toEl, pinType, fromSize.height, toSize.height, options],
		{
			effect: useDeepCompareEffect,
			recreateOnResize: true,
			extraDeps: [fromSize.width, toSize.width, ...dependencies],
		},
	)

	return (
		<Context.Provider
			value={{
				fromEl,
				toEl,
				setFromEl,
				setToEl,
			}}
		>
			{children}
		</Context.Provider>
	)
}

export const ZoomPinFrom = (props: ComponentProps<"div">) => {
	const { toEl, setFromEl } = useContext(Context)
	const { width, height } = useSize(toEl)

	return (
		<div
			{...props}
			ref={setFromEl}
			style={{
				aspectRatio: `${width}/${height}`,
			}}
		/>
	)
}

export const ZoomPinTo = ({
	children,
	...props
}: ComponentProps<"div"> & { children: ReactNode }) => {
	const { setToEl } = useContext(Context)

	return (
		<div {...props}>
			<div ref={setToEl}>{children}</div>
		</div>
	)
}
