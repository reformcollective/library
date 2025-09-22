import { useLatest } from "ahooks"
import gsap from "gsap/all"
import { useRef } from "react"
import { useAnimation } from "./useAnimation"

export function ResizingContainer({
	children,
	className,
	...options
}: { children: React.ReactNode; className?: string } & gsap.TweenVars) {
	const ref = useRef<HTMLDivElement>(null)
	const sizer = useRef<HTMLDivElement>(null)

	const latestOptions = useLatest(options)

	useAnimation(() => {
		const container = ref.current
		if (!container) throw new Error("Container not found")

		const setHeight = gsap.quickTo(container, "height", {
			...latestOptions,
		})

		const observer = new ResizeObserver(() => {
			const sizerBounds = sizer.current?.getBoundingClientRect()

			// respect the containers min height
			container.style.height = "0"
			const minHeight = container.getBoundingClientRect().height

			setHeight(Math.max(sizerBounds?.height ?? 0, minHeight))
		})
		if (sizer.current) observer.observe(sizer.current)

		return () => {
			observer.disconnect()
		}
	}, [latestOptions])

	return (
		<div ref={ref} className={className}>
			<div ref={sizer} style={{ height: "fit-content" }}>
				{children}
			</div>
		</div>
	)
}
