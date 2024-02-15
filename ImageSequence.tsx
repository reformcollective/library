import gsap from "gsap"
import loader, { transitionAwaitPromise } from "library/Loader"
import { useCallback, useEffect, useRef, useState } from "react"
import styled from "styled-components"

interface SequenceProps {
	className?: string
	length: number
	folder: string
}

type PropsScroll = SequenceProps & {
	type: "scroll"
	trigger: HTMLElement | string | null
	triggerStart?: string | number
	triggerEnd?: string | number
	ease?: string

	frame?: never
	duration?: never
}

type PropsAuto = SequenceProps & {
	type?: "auto"
	ease?: string

	frame?: never
	trigger?: never
	duration?: number
	triggerStart?: never
	triggerEnd?: never
}

type PropsManual = SequenceProps & {
	type: "manual"
	frame: number

	trigger?: never
	duration?: never
	ease?: never
	triggerStart?: never
	triggerEnd?: never
}

export default function ImageSequence({
	className = "",
	length,
	folder,
	trigger,
	triggerStart,
	triggerEnd,
	frame,
	ease,
	duration,
	type = "auto",
}: PropsAuto | PropsScroll | PropsManual) {
	const [sequenceData] = useState({
		frame: 0,
		images: [] as HTMLImageElement[],
		ease,
	})
	const [canvasWidth, setWidth] = useState(0)
	const [canvasHeight, setHeight] = useState(0)

	const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)
	const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)

	/**
	 * render the currently selected frame
	 */
	const render = () => {
		const imgToRender = sequenceData.images[sequenceData.frame]

		if (
			canvasEl &&
			context &&
			imgToRender instanceof HTMLImageElement &&
			imgToRender.complete
		) {
			const { width, height } = imgToRender
			// setting the width here is important, otherwise safari freaks the FUCK out
			canvasEl.width = width
			canvasEl.height = height
			context.clearRect(0, 0, width, height)
			context.drawImage(imgToRender, 0, 0, width, height)
		}
	}

	const latestRender = useRef<VoidFunction>(render)
	latestRender.current = render

	/**
	 * Given an image source, create an image and add it to the sequenceData.images array
	 * at the given index.
	 * @param src The image source
	 * @param index The index to add the image to
	 */
	const createImage = useCallback(
		(src: string, index: number) => {
			// if the image already exists, don't load it again
			if (sequenceData.images[index]) return
			const img = new Image()
			img.src = src
			sequenceData.images[index] = img

			const onImageLoad = () => {
				setWidth((width) => Math.max(width, img.naturalWidth))
				setHeight((height) => Math.max(height, img.naturalHeight))
				requestAnimationFrame(() => {
					latestRender.current()
				})
			}

			img.addEventListener("load", onImageLoad)
			return () => img.removeEventListener("load", onImageLoad)
		},
		[sequenceData.images],
	)

	/**
	 * Preload the images
	 */
	useEffect(() => {
		for (let i = 0; i < length; i += 1) {
			const maxLen = length.toString().length
			const imageNumber = i.toString().padStart(maxLen, "0")

			// eslint-disable-next-line no-unsanitized/method
			const prom = import(`../images/sequences/${folder}/${imageNumber}.webp`)
				.then((image: { default: string }) => {
					return createImage(image.default, i)
				})
				.catch(console.error)

			// if this is an auto sequence, the loader should wait for all images to settle (max 5s)
			if (type === "auto") transitionAwaitPromise(prom)
		}
	}, [createImage, folder, length, type])

	/**
	 * Update the drawing context when the canvas element is created
	 */
	useEffect(() => {
		if (canvasEl) setContext(canvasEl.getContext("2d"))
	}, [canvasEl])

	/**
	 * Create the timeline and play it when ready
	 */
	useEffect(() => {
		// if in manual mode, render the frame when it changes
		if (
			type === "manual" // skip timeline creation if in manual mode
		) {
			sequenceData.frame = frame ?? 0
			requestAnimationFrame(() => {
				latestRender.current()
			})
		} else {
			const tween = gsap.fromTo(
				sequenceData,
				{
					frame: 0,
				},
				{
					frame: length - 1,
					snap: "frame",
					delay: 1,
					duration: duration ?? 3,
					ease: ease ?? "none",
					paused: true,
					onUpdate: () => {
						requestAnimationFrame(() => {
							latestRender.current()
						})
					},
					scrollTrigger: trigger
						? {
								trigger,
								scrub: 0.5,
								start: triggerStart ?? "top top",
								end: triggerEnd ?? "bottom top",
						  }
						: undefined,
				},
			)

			const onReady = () => {
				if (type === "auto")
					Promise.allSettled(sequenceData.images)
						.then(() => {
							return tween.play(0)
						})
						.catch(console.error)
			}

			loader.addEventListener("anyEnd", onReady)
			return () => {
				loader.removeEventListener("anyEnd", onReady)
				tween.kill()
			}
		}
	}, [
		duration,
		ease,
		frame,
		length,
		sequenceData,
		trigger,
		triggerEnd,
		triggerStart,
		type,
	])

	/**
	 * change in width or height should trigger a re-render
	 */
	useEffect(() => {
		const onResize = () => {
			requestAnimationFrame(() => {
				latestRender.current()
			})
		}
		onResize()
		window.addEventListener("resize", onResize)
		return () => window.removeEventListener("resize", onResize)
	}, [canvasWidth, canvasHeight])

	return (
		<Canvas
			className={className}
			height={canvasHeight}
			width={canvasWidth}
			ref={setCanvasEl}
		/>
	)
}

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
`
