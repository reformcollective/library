import {
	type ComponentProps,
	type ReactNode,
	createContext,
	useContext,
	useState,
	useEffect,
} from "react"
import useAnimation from "./useAnimation"

import Flip from "gsap/Flip"
import gsap from "gsap"

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

	useAnimation(
		() => {
			if (!fromEl || !toEl) return

			const state = Flip.getState(toEl)
			Flip.fit(toEl, fromEl, { scale: true })

			Flip.to(state, {
				duration: 4,
				scale: true,
				ease: "none",
				scrollTrigger: {
					trigger: fromEl,
					start: "center center",
					endTrigger: toEl.parentElement,
					end: "center center",
					scrub: true,
				},
			})
		},
		[fromEl, toEl],
		{
			recreateOnResize: true,
			extraDeps: [fromSize.width, fromSize.height, toSize.width, toSize.height],
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
