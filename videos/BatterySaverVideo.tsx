import { keyframes } from "@vanilla-extract/css"
import { eases } from "library/eases"
import Portal from "library/Portal"
import { css, f, styled } from "library/styled"
import {
	type ComponentProps,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react"

import { MuxVideo } from "./MuxVideo"

// Set to true to simulate NotAllowedError for testing
const FORCE_FAIL = false

const INTERACTION_EVENTS = [
	"pointerdown",
	"pointermove",
	"wheel",
	"touchstart",
	"keydown",
] as const

export function BatterySaverVideo({
	ref,
	autoPlay,
	...props
}: ComponentProps<typeof MuxVideo>) {
	"use no memo"
	const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
	const playPromiseRef = useRef<Promise<void> | null>(null)
	const [showLowPowerMode, setShowLowPowerMode] = useState(false)

	const attemptPlay = useCallback(() => {
		if (!videoEl) return Promise.resolve()

		// If we're already trying to play, return the existing promise
		if (playPromiseRef.current) return playPromiseRef.current

		// Get the original play method
		const originalPlay = HTMLMediaElement.prototype.play.bind(videoEl)

		const run = async () => {
			const playOrMock = FORCE_FAIL
				? Promise.reject(
						new DOMException(
							"The play() request was interrupted by a call to pause().",
							"NotAllowedError",
						),
					)
				: originalPlay()

			const startError = await playOrMock.catch((e: Error) => e)
			if (!startError) return

			if (startError.name !== "NotAllowedError") {
				throw startError
			}

			// 1. Immediate check: If never interacted, show dialog immediately
			if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
				setShowLowPowerMode(true)
				return
			}

			// 2. Wait for interaction or timeout
			await new Promise<void>((resolve) => {
				const cleanup = () => {
					clearTimeout(timer)
					INTERACTION_EVENTS.forEach((event) => {
						document.removeEventListener(event, listener)
					})
				}

				const listener = () => {
					cleanup()
					resolve()
				}

				const timer = setTimeout(listener, 5000)

				INTERACTION_EVENTS.forEach((event) => {
					document.addEventListener(event, listener)
				})
			})

			// 3. Retry play
			const retryError = await originalPlay().catch((e: Error) => e)
			if (retryError) setShowLowPowerMode(true)
		}

		playPromiseRef.current = run().finally(() => {
			playPromiseRef.current = null
		})
		return playPromiseRef.current
	}, [videoEl])

	useImperativeHandle<HTMLVideoElement | null, HTMLVideoElement | null>(
		ref,
		() => videoEl,
		[videoEl],
	)

	useEffect(() => {
		if (autoPlay) {
			attemptPlay()
		}
	}, [autoPlay, attemptPlay])

	const handleManualPlay = async () => {
		const originalPlay = HTMLMediaElement.prototype.play.bind(videoEl)
		await originalPlay()
		setShowLowPowerMode(false)
	}

	return (
		<>
			<Video
				{...props}
				ref={(el: HTMLVideoElement | null) => {
					if (el) el.play = attemptPlay

					setVideoEl(el)
				}}
				// We handle autoplay manually
				autoPlay={false}
			/>
			{showLowPowerMode && (
				<Portal>
					<LowPowerOverlay onClick={handleManualPlay}>
						<PlayButton aria-label="Play video">
							<PlayIconSvg
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="currentColor"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path d="M8 5v14l11-7z" />
							</PlayIconSvg>
						</PlayButton>
						<LowPowerMessage>
							<br />
							Site paused by low power mode
							<br />
						</LowPowerMessage>
					</LowPowerOverlay>
				</Portal>
			)}
		</>
	)
}

const Video = styled(
	MuxVideo,
	f.unresponsive(css`
		width: 100%;
		height: 100%;
		object-fit: cover;
	`),
)

const fadeIn = keyframes({
	from: {
		opacity: 0,
	},
	to: {
		opacity: 1,
	},
})

const LowPowerOverlay = styled(
	"button",
	f.unresponsive(css`
		position: fixed;
		inset: 0;
		display: grid;
		place-content: center;
		place-items: center;
		background: rgb(0 0 0 / 5%);
		cursor: pointer;
		z-index: 9999;
		backdrop-filter: blur(5px);
		animation: ${fadeIn} 1s ${eases.cubic.inOut};
	`),
)

const PlayButton = styled(
	"div",
	f.unresponsive(css`
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: rgb(255 255 255 / 80%);
		color: black;
		display: flex;
		align-items: center;
		justify-content: center;
	`),
)

const PlayIconSvg = styled(
	"svg",
	f.unresponsive(css`
		width: 32px;
		height: 32px;
		margin-left: 2px;
	`),
)

const LowPowerMessage = styled(
	"div",
	f.unresponsive(css`
		color: white;
		text-align: center;
		font-size: 14px;
		font-weight: 500;
		line-height: 1.4;
	`),
)
