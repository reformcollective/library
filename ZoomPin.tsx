import {
	type ComponentProps,
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useState,
} from "react"
import useAnimation from "./useAnimation"

import gsap from "gsap"
import Flip from "gsap/Flip"
import { usePinType } from "./Scroll"

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
			setWidth(el.offsetWidth)
			setHeight(el.offsetHeight)
		})

		observer.observe(el)

		return () => observer.disconnect()
	}, [el])

	return { width, height }
}

export const ZoomPinProvider = ({ children }: { children: ReactNode }) => {
	const [fromEl, setFromEl] = useState<HTMLDivElement | null>(null)
	const [toEl, setToEl] = useState<HTMLDivElement | null>(null)
	const fromSize = useSize(fromEl)
	const toSize = useSize(toEl)
	const pinType = usePinType()
	const [refreshSignal, setRefreshSignal] = useState(0)

	useAnimation(
		() => {
			if (!fromEl || !toEl) return
			gsap.set([fromEl, toEl], {
				clearProps: "transform",
				willChange: "transform",
			})

			const topDiff =
				fromEl.getBoundingClientRect().top - toEl.getBoundingClientRect().top
			const heightDiff = (fromSize.height ?? 0) - (toSize.height ?? 0)
			gsap.set(toEl, {
				y: topDiff + heightDiff / 2,
			})

			gsap.delayedCall(0.1, () => {
				const state = Flip.getState(toEl)
				Flip.fit(toEl, fromEl, {
					scale: true,
				})
				Flip.fit(toEl, state, {
					scale: true,
					duration: 5,
					ease: "none",
					scrollTrigger: {
						trigger: fromEl,
						start: "center center",
						endTrigger: toEl.parentElement,
						end: "center center",
						scrub: true,
						pinType,
						pin: toEl,
						pinSpacing: false,
					},
				})
			})
		},
		[fromEl, toEl, pinType, fromSize.height, toSize.height],
		{
			recreateOnResize: true,
			extraDeps: [fromSize.width, toSize.width, refreshSignal],
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
		<div>
			<div {...props} ref={setToEl}>
				{children}
			</div>
		</div>
	)
}
