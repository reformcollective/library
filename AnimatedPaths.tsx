import gsap from "gsap"
import DrawSVGPlugin from "gsap/DrawSVGPlugin"
import { useState } from "react"
import styled from "styled-components"
import useAnimation from "./useAnimation"

gsap.registerPlugin(DrawSVGPlugin)

const randomNumber = (min: number, max: number) =>
	Math.floor(Math.random() * (max - min + 1)) + min

export function AnimatedPaths({
	children,
	className = "",
	selector = "path",
	continuous = false,
	lineLength = [50, 150],
	lineSpeed = [150, 250],
	lineRange = [0, 1],
}: {
	/**
	 * pass in the SVG
	 */
	children: React.ReactNode
	/**
	 * style the wrapper, if desired
	 */
	className?: string
	/**
	 * which paths should animate?
	 * by default, all paths will animate
	 */
	selector?: string
	/**
	 * if you have issues with the animation pausing improperly,
	 * for example, if the lines are pinned,
	 * set this to true
	 */
	continuous?: boolean
	/**
	 * set the length of the line to draw
	 * min and max values
	 */
	lineLength?: [number, number]
	/**
	 * set the speed of the line to draw in pixels per second
	 * min and max values
	 */
	lineSpeed?: [number, number]
	/**
	 * if you only want to animate over a certain subset of the paths,
	 * you can pass the start and end points here
	 *
	 * [start, end]
	 * starting point, as a percentage of the total path length
	 * ending point, as a percentage of the total path length
	 */
	lineRange?: [number, number]
}) {
	const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null)
	const [start, end] = lineRange

	useAnimation(
		() => {
			const getLineLength = () => randomNumber(lineLength[0], lineLength[1])
			const getLineSpeed = () => randomNumber(lineSpeed[0], lineSpeed[1])

			const drawPath = (target: SVGPathElement) => {
				const length = DrawSVGPlugin.getLength(target) * (end - start)
				const startingPoint = DrawSVGPlugin.getLength(target) * start
				const size = Math.min(length / 2, getLineLength())

				// in pixels per second
				const speed = getLineSpeed()
				const totalDuration = length / speed

				// what percentage of the line is the size?
				const endProportion = size / length

				const tl = gsap.timeline({
					repeat: -1,
				})

				tl.fromTo(
					target,
					{
						drawSVG: `${startingPoint} ${startingPoint}`,
					},
					{
						drawSVG: `${startingPoint} ${startingPoint + size}`,
						ease: "linear",
						duration: totalDuration * endProportion,
					},
					0,
				)
					.to(target, {
						duration: totalDuration * (1 - endProportion),
						drawSVG: `${startingPoint + length - size} ${
							startingPoint + length
						}`,
						ease: "linear",
					})
					.to(target, {
						duration: totalDuration * endProportion,
						drawSVG: `${startingPoint + length} ${startingPoint + length}`,
						ease: "linear",
					})

				// don't repeat more than once per second
				tl.to(null, {
					duration: 1,
				})

				return tl
			}

			if (wrapper) {
				const allPaths: SVGPathElement[] = Array.from(
					wrapper.querySelectorAll(selector),
				)

				const tl = gsap.timeline({
					repeat: -1,
					repeatRefresh: true,
					scrollTrigger: {
						trigger: wrapper,
						start: "top 90%",
						end: "bottom top",
						toggleActions: continuous
							? "play play play play"
							: "play pause resume pause",
					},
				})

				for (const path of allPaths) {
					gsap.set(path, {
						visibility: "visible",
					})

					tl.add(drawPath(path), randomNumber(2, 6) / 10)
				}
			}
		},
		[
			wrapper,
			selector,
			continuous,
			lineLength[0],
			lineLength[1],
			lineSpeed[0],
			lineSpeed[1],
			start,
			end,
		],
		{
			recreateOnResize: true,
			kill: true,
		},
	)

	return (
		<Wrapper
			className={className}
			ref={(ref) => setWrapper(ref)}
			$selector={selector}
		>
			{children}
		</Wrapper>
	)
}

const Wrapper = styled.div<{ $selector: string }>`
	${(props) => props.$selector} {
		visibility: hidden;
	}
`
