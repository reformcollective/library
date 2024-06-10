import { ScrollSmoother } from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { type RefObject, useState } from "react"
import useAnimation from "./useAnimation"

const isElementInViewport = (element: HTMLElement | null) => {
	const rect = element?.getBoundingClientRect()
	return (
		rect &&
		rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
		rect.bottom >= 0
	)
}

const checkElementsInViewport = (elementIds: string[]) => {
	for (const elementId of elementIds) {
		const element = document.getElementById(elementId)
		if (element && isElementInViewport(element)) {
			return true
		}
	}
	return false
}

export default function useAutoHideHeader(
	wrapper: RefObject<HTMLDivElement>,
	hideHeaderElementIds: string[] = [],
	stickyHeaderElementIds: string[] = [],
) {
	const [translateY, setTranslateY] = useState(0)

	useAnimation(() => {
		let lastScroll = 0

		ScrollTrigger.create({
			onUpdate: () => {
				const scroll = ScrollSmoother.get()?.scrollTop() ?? 0
				const delta = scroll - lastScroll
				lastScroll = scroll
				const height = wrapper.current?.offsetHeight ?? 0

				const shouldHideHeader = checkElementsInViewport(hideHeaderElementIds)
				const shouldStickyHeader = checkElementsInViewport(
					stickyHeaderElementIds,
				)

				if (shouldHideHeader) {
					setTranslateY(-height)
				} else if (shouldStickyHeader) {
					setTranslateY(0)
				} else if (delta > 0) {
					setTranslateY((prev) => Math.max(-height, prev - delta))
				} else {
					setTranslateY((prev) => Math.min(0, prev - delta))
				}
			},
		})
	}, [stickyHeaderElementIds, hideHeaderElementIds, wrapper])

	return translateY
}
