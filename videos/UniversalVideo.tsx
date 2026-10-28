"use client"

import { library } from "library/layers.css"
import { css, f, styled } from "library/styled"
import { stegaClean } from "next-sanity"
import {
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
	useSyncExternalStore,
} from "react"
import { resolveSource } from "library/videos/providers/parse"
import { resolveProvider } from "library/videos/providers/registry"
import { createVideoLogger, logAdapterEvent } from "library/videos/debug"
import { resolveMuxData } from "library/videos/analytics/privacy"
import { useVideoConfig } from "library/videos/config"
import { createController } from "library/videos/controller/createController"
import { hasPresentedFrame } from "library/videos/controller/stateMachine"
import { useVideoEvents } from "library/videos/controller/videoEvents"
import {
	DEFAULT_VIDEO_LABELS,
	VideoContext,
	VideoStateContext,
} from "library/videos/controller/VideoContext"
import { Facade } from "library/videos/facade/Facade"
import { PartsContext } from "library/videos/parts/context"
import { DefaultControls } from "library/videos/parts/DefaultControls"
import { ErrorMessage } from "library/videos/parts/ErrorMessage"
import { Loading } from "library/videos/parts/Loading"
import { PlayButton } from "library/videos/parts/PlayButton"
import { PlayOverlay } from "library/videos/parts/PlayOverlay"
import { Poster, type PosterProps } from "library/videos/poster/Poster"
import {
	aspectRatioToCss,
	DEFAULT_MUX_POSTER_TIME,
	muxPosterSource,
	parseAspectRatio,
	type PosterSource,
} from "library/videos/poster/posterUrls"
import { VideoJsonLd } from "library/videos/seo/VideoJsonLd"
import { debugCounters, getVideoDebugStats } from "library/videos/trigger/concurrency"
import {
	useDataSaver,
	useInViewTrigger,
	useNearViewport,
	usePrefersReducedMotion,
} from "library/videos/trigger/useInViewTrigger"
import type {
	AdapterMountOptions,
	ProviderAdapter,
	ProviderAdapterFactory,
	ResolvedSource,
	UniversalVideoHandle,
	UniversalVideoProps,
	VideoChapter,
	ControllerInternals,
	VideoError,
} from "library/videos/types"
import { aspectRatioVar } from "./UniversalVideo.css"

export { getVideoDebugStats }

type StandaloneProps = Omit<UniversalVideoProps, "video" | "src" | "playbackId" | "ref">

interface InnerProps extends StandaloneProps {
	source: ResolvedSource
	video: UniversalVideoProps["video"]
	handleRef: UniversalVideoProps["ref"]
}

const IFRAME_PROVIDERS: readonly string[] = [
	"youtube",
	"vimeo",
	"wistia",
	"twitch",
	"tiktok",
	"spotify",
	"cloudflare",
]
const READY_WARN_MS = 8000
const READY_TIMEOUT_MS = 12000
const WISTIA_READY_TIMEOUT_MS = 20000
const warnedMuxIds = new Set<string>()
let mainContentCount = 0

function devWarn(message: string) {
	if (process.env.NODE_ENV !== "production") console.warn(`UniversalVideo: ${message}`)
}

function sourceId(source: ResolvedSource) {
	if (source.provider === "mux") return source.playbackId
	if (source.provider === "file") return source.sources[0]?.src ?? ""
	return source.id
}

function sourceUrl(source: ResolvedSource) {
	if (source.provider === "mux") return `https://stream.mux.com/${source.playbackId}.m3u8`
	if (source.provider === "file") return source.sources[0]?.src
	return source.url
}

function toLoadError(error: unknown, source: ResolvedSource): VideoError {
	const message = error instanceof Error ? error.message : "The player failed to load"
	return { code: "load", message, retryable: true, provider: source.provider }
}

function describeLoad(input: {
	shouldMount: boolean
	userActivated: boolean
	loadsEarly: boolean
	near: boolean
	suppressed: boolean
	useFacade: boolean
	blockedEmbed: boolean
}) {
	if (input.shouldMount) {
		if (input.userActivated) return "user activated"
		if (input.loadsEarly) return "eager, priority or mainContent"
		return "near viewport"
	}
	if (input.blockedEmbed) return "embed was blocked, showing facade"
	if (input.suppressed) return "suppressed by reduced motion or data saver"
	if (input.useFacade) return "facade waiting for a click"
	return "waiting to get near the viewport"
}

function createHandle(
	controller: ControllerInternals,
	container: HTMLElement | null,
	media: HTMLElement | null,
): UniversalVideoHandle {
	return {
		play: controller.play,
		pause: controller.pause,
		playFromTrigger: controller.playFromTrigger,
		pauseFromTrigger: controller.pauseFromTrigger,
		claimTrigger: controller.claimTrigger,
		toggle: controller.toggle,
		restart: controller.restart,
		seek: controller.seek,
		seekBy: controller.seekBy,
		setMuted: controller.setMuted,
		setVolume: controller.setVolume,
		setPlaybackRate: controller.setPlaybackRate,
		setTextTrack: controller.setTextTrack,
		setAudioTrack: controller.setAudioTrack,
		setQuality: controller.setQuality,
		setChapter: controller.setChapter,
		requestFullscreen: controller.requestFullscreen,
		exitFullscreen: controller.exitFullscreen,
		requestPictureInPicture: controller.requestPictureInPicture,
		promptRemotePlayback: controller.promptRemotePlayback,
		releaseManualControl: controller.releaseManualControl,
		retry: controller.retry,
		onExtra: controller.onExtra,
		getState: controller.getState,
		subscribe: controller.subscribe,
		get capabilities() {
			return controller.capabilities
		},
		get extras() {
			return controller.extras
		},
		container,
		media,
	}
}

/**
 * One component for Mux, file, HLS and embedded sources. Renders a poster on the server and creates the player on the client.
 * Compound parts and `useVideo()` read the surrounding controller.
 */
export function UniversalVideo({
	video,
	src,
	playbackId,
	ref,
	...rest
}: UniversalVideoProps) {
	const cleaned = video ? stegaClean(video) : undefined
	const source = resolveSource(cleaned, { src, playbackId })
	if (!source) {
		devWarn("no usable video, src or playbackId was provided")
		return null
	}
	const key = JSON.stringify(source)
	return (
		<UniversalVideoInner
			key={key}
			source={source}
			video={cleaned}
			handleRef={ref}
			{...rest}
		/>
	)
}

function UniversalVideoInner({
	source,
	video,
	handleRef,
	mode: modeProp,
	mainContent: mainContentProp,
	facade = "auto",
	priority = false,
	eager = false,
	debug = false,
	debugLabel,
	loadMargin = "400px",
	trigger,
	play,
	muted: mutedProp,
	loop: loopProp,
	startTime: startTimeProp,
	endTime: endTimeProp,
	poster,
	posterTime,
	aspectRatio,
	controls: controlsProp,
	controlsPlacement: placementProp,
	showPause = true,
	label: labelProp,
	labels,
	captions = "off",
	chapters: chaptersProp,
	privacy: privacyProp,
	muxData,
	mux,
	analytics,
	canTrack,
	onVideoEvent,
	onReady,
	onPlay,
	onPause,
	onEnded,
	onError,
	onBlocked,
	onTimeUpdate,
	className,
	children,
}: InnerProps) {
	const config = useVideoConfig()
	const mode = modeProp ?? video?.mode ?? "click"
	const mainContent = mainContentProp ?? video?.mainContent ?? false
	const isIframe = IFRAME_PROVIDERS.includes(source.provider)
	const isYouTube = source.provider === "youtube"
	const background = mode === "background"
	const loop = loopProp ?? video?.loop ?? background
	const muted = mode === "click" ? (mutedProp ?? video?.muted ?? false) : true
	const startTime = startTimeProp ?? video?.startTime ?? undefined
	const endTime = endTimeProp ?? video?.endTime ?? undefined
	const chapters: VideoChapter[] =
		chaptersProp ??
		(video?.chapters ?? []).flatMap((chapter) =>
			chapter.title !== undefined && chapter.startTime !== undefined
				? [{ startTime: chapter.startTime, title: chapter.title }]
				: [],
		)
	const privacy = privacyProp ?? video?.privacy ?? true
	const label = labelProp ?? video?.title ?? undefined
	const placement = placementProp ?? "overlay"
	const controlsField = video?.controls
	let controls: boolean | "provider" = !background
	if (controlsField === "ours") controls = true
	else if (controlsField === "provider") controls = "provider"
	else if (controlsField === "none") controls = false
	if (controlsProp !== undefined) controls = controlsProp
	const mergedLabels = { ...DEFAULT_VIDEO_LABELS, ...labels }

	const definition = resolveProvider(source)
	const [controller] = useState(() =>
		createController({
			provider: source.provider,
			capabilities: definition.capabilities,
			mode,
			props: { play, muted, loop, startTime, endTime },
		}),
	)
	const [log] = useState(() => createVideoLogger(source.provider, debugLabel ?? label, debug))
	const state = useSyncExternalStore(
		controller.subscribe,
		controller.getState,
		controller.getState,
	)
	const [rootEl, setRootEl] = useState<HTMLElement | null>(null)
	const [mediaEl, setMediaEl] = useState<HTMLElement | null>(null)
	const [userActivated, setUserActivated] = useState(false)
	const [blockedEmbed, setBlockedEmbed] = useState(false)
	const [attempt, setAttempt] = useState(0)

	const reducedMotion = usePrefersReducedMotion()
	const dataSaver = useDataSaver()
	const suppressed = (background && reducedMotion) || (mode !== "click" && dataSaver)

	let useFacade = false
	if (!mainContent) {
		if (facade === true) useFacade = mode === "click"
		else if (facade === "auto") useFacade = mode === "click" && isIframe
	}
	const facadeIgnored = facade === true && mode !== "click"
	useEffect(() => {
		if (facadeIgnored) devWarn("facade is ignored in autoplay and background modes")
	}, [facadeIgnored])

	const loadsEarly = eager || priority || mainContent
	const near = useNearViewport(rootEl, loadMargin, !loadsEarly && !useFacade && !suppressed)
	const baseLoad = !suppressed && !useFacade && (loadsEarly || near)
	const shouldMount = (baseLoad || userActivated || (mainContent && !suppressed)) && !blockedEmbed

	useEffect(() => {
		log("source resolved", { provider: source.provider, id: sourceId(source), mode })
	}, [log, source, mode])
	useEffect(() => {
		if (!log.enabled()) return
		const reason = describeLoad({
			shouldMount,
			userActivated,
			loadsEarly,
			near,
			suppressed,
			useFacade,
			blockedEmbed,
		})
		log(`load decision: ${shouldMount ? "mount" : "do not mount"} (${reason})`, {
			mode,
			near,
			facade: useFacade,
			userActivated,
			suppressed,
			loadsEarly,
			blockedEmbed,
		})
	}, [
		log,
		mode,
		near,
		useFacade,
		userActivated,
		suppressed,
		loadsEarly,
		blockedEmbed,
		shouldMount,
	])
	useEffect(() => {
		log(`state status ${state.status}`, state.error ?? undefined, state.status === "error" ? "warn" : "log")
	}, [log, state.status, state.error])

	const customTrigger = trigger === "custom"
	const triggerEnabled =
		trigger === undefined ? mode !== "click" : trigger !== false && !customTrigger
	let triggerOptions = null
	if (triggerEnabled) triggerOptions = typeof trigger === "object" ? trigger : {}
	useInViewTrigger({
		target: rootEl,
		controller,
		provider: source.provider,
		options: triggerOptions,
		suppressed,
		maxConcurrent: config.maxConcurrent,
		log,
	})

	let preload: AdapterMountOptions["preload"] = "auto"
	if (!priority && !mainContent) {
		if (mode === "click" && controls !== "provider") preload = "metadata"
		else if (dataSaver) preload = "none"
	}

	const mountInputs = {
		source,
		muted,
		loop,
		autoplay:
			(mode !== "click" &&
				(source.provider === "tiktok" || (!triggerEnabled && !customTrigger)) &&
				play !== false) ||
			(isIframe && userActivated),
		background,
		controls: controls === "provider" ? ("provider" as const) : ("none" as const),
		preload,
		startTime,
		endTime,
		captionsDefault: captions,
		privacy,
		chapters,
		mux,
		muxDataInput: muxData,
		canTrack: canTrack ?? config.canTrack,
		label,
	}
	const latest = useRef(mountInputs)
	useEffect(() => {
		latest.current = mountInputs
	})

	useEffect(() => {
		if (!shouldMount || !mediaEl) return
		const container = mediaEl
		const abort = new AbortController()
		const mounted: { adapter: ProviderAdapter | null } = { adapter: null }
		let cancelled = false
		const current = latest.current
		let stage = "provider import"
		let warnTimer: ReturnType<typeof setTimeout> | undefined
		let readyTimer: ReturnType<typeof setTimeout> | undefined
		let unsubscribeWanted: (() => void) | undefined
		const importStarted = performance.now()
		log(`provider import start (${current.source.provider})`, { attempt })

		const onLoaded = (factory: ProviderAdapterFactory) => {
			if (cancelled) return
			log(`provider import finished in ${Math.round(performance.now() - importStarted)}ms`)
			stage = "adapter mount"
			const inputs = latest.current
			const options: AdapterMountOptions = {
				source: inputs.source,
				muted: inputs.muted,
				loop: inputs.loop,
				autoplay: inputs.autoplay,
				background: inputs.background,
				controls: inputs.controls,
				preload: inputs.preload,
				startTime: inputs.startTime,
				endTime: inputs.endTime,
				captionsDefault: inputs.captionsDefault,
				privacy: inputs.privacy,
				tracks: [],
				chapters: inputs.chapters,
				mux: inputs.mux,
				muxData: resolveMuxData(inputs.muxDataInput, inputs.canTrack),
				label: inputs.label,
				hostname: window.location.hostname,
				emit: (event) => {
					logAdapterEvent(log, event)
					controller.handle(event)
				},
				signal: abort.signal,
			}
			log("adapter mount", {
				autoplay: options.autoplay,
				muted: options.muted,
				loop: options.loop,
				preload: options.preload,
				background: options.background,
			})
			mounted.adapter = factory.mount(container, options)
			stage = "adapter attach"
			controller.attach(mounted.adapter)
			log("adapter mounted")
			if (log.enabled()) {
				warnTimer = setTimeout(() => {
					const now = controller.getState()
					if (!now.ready)
						log(
							`mount never reached ready within ${READY_WARN_MS / 1000}s`,
							{ status: now.status, error: now.error },
							"warn",
						)
				}, READY_WARN_MS)
			}
			const exempt =
				inputs.source.provider === "tiktok" || inputs.source.provider === "spotify"
			const timeoutMs = inputs.source.provider === "wistia" ? WISTIA_READY_TIMEOUT_MS : READY_TIMEOUT_MS
			const onTimeout = () => {
				const now = controller.getState()
				if (now.status === "error" || now.status === "blocked" || hasPresentedFrame(now.status)) return
				if (now.wanted !== "play") return
				if (controller.capabilities.play === "no") return
				controller.handle({
					type: "error",
					error: {
						code: "timeout",
						message: "The player did not start",
						retryable: false,
						provider: inputs.source.provider,
					},
				})
			}
			let previousWanted = controller.getState().wanted
			const arm = () => {
				clearTimeout(readyTimer)
				readyTimer = setTimeout(onTimeout, timeoutMs)
			}
			if (!exempt) {
				if (previousWanted === "play") arm()
				unsubscribeWanted = controller.subscribe(() => {
					const wanted = controller.getState().wanted
					if (wanted === "play" && previousWanted !== "play") arm()
					previousWanted = wanted
				})
			}
		}
		const onFailed = (error: unknown) => {
			if (cancelled) return
			log(`${stage} FAILED`, error, "warn")
			controller.handle({ type: "error", error: toLoadError(error, current.source) })
		}
		resolveProvider(current.source).load().then(onLoaded).catch(onFailed)

		return () => {
			cancelled = true
			clearTimeout(warnTimer)
			clearTimeout(readyTimer)
			unsubscribeWanted?.()
			abort.abort()
			controller.detach()
			mounted.adapter?.destroy()
		}
	}, [shouldMount, mediaEl, controller, attempt, log])

	useEffect(() => {
		controller.setProps({ play, muted, loop, startTime, endTime })
	}, [controller, play, muted, loop, startTime, endTime])

	useEffect(() => {
		controller.setCallbacks({
			onReady,
			onPlay,
			onPause,
			onEnded,
			onError,
			onTimeUpdate,
			onBlocked: () => {
				if (isIframe && isYouTube) {
					setBlockedEmbed(true)
					setUserActivated(false)
				}
				onBlocked?.()
			},
		})
	}, [
		controller,
		isIframe,
		isYouTube,
		onReady,
		onPlay,
		onPause,
		onEnded,
		onError,
		onTimeUpdate,
		onBlocked,
	])

	useEffect(() => {
		const offCommand = controller.onCommand(({ command, origin }) => {
			log(`command ${command} (origin ${origin})`)
			if (command !== "play" || origin === "trigger") return
			setUserActivated(true)
			setBlockedEmbed(false)
		})
		const offRetry = controller.onRetry(() => {
			log("retry: remounting adapter")
			setAttempt((value) => value + 1)
		})
		return () => {
			offCommand()
			offRetry()
		}
	}, [controller, log])

	useEffect(() => {
		if (play === undefined || (!shouldMount && !useFacade)) return
		if (play) void controller.play({ origin: "external" })
		else controller.pause({ origin: "external" })
	}, [controller, play, shouldMount, useFacade])

	useEffect(() => {
		debugCountMounted(1)
		if (mainContent) {
			mainContentCount += 1
			if (mainContentCount > 1) devWarn("only one video per page should set mainContent")
		}
		return () => {
			debugCountMounted(-1)
			if (mainContent) mainContentCount -= 1
		}
	}, [mainContent])

	useVideoEvents(controller, {
		provider: source.provider,
		videoId: sourceId(source),
		title: label,
		url: sourceUrl(source),
		mode,
		loop,
		analytics: analytics ?? (background ? false : config.analytics),
		canTrack: canTrack ?? config.canTrack,
		onVideoEvent,
	})

	useImperativeHandle(
		handleRef,
		() => createHandle(controller, rootEl, mediaEl),
		[controller, rootEl, mediaEl],
	)

	const showFacade = (useFacade && !userActivated) || blockedEmbed
	const playerMounted = shouldMount && !showFacade
	// Autoplay and background media-element videos keep the poster until a frame has been painted while playing, so a preloaded paused first frame never replaces it.
	const gateByPlay = mode !== "click" && !isIframe
	const framePresented = gateByPlay ? state.framePainted : hasPresentedFrame(state.status)
	const failed = state.status === "error" || state.status === "blocked"

	const uploadedImage = video?.posterImage
	const uploaded: PosterProps["uploaded"] =
		poster ??
		(uploadedImage?.asset
			? { ...uploadedImage, willHaveAlt: "false" as const }
			: undefined)

	const aspect = parseAspectRatio(
		aspectRatio ?? video?.muxVideo?.data?.videoAspectRatio,
	)
	let fallback: PosterSource | null = null
	if (!uploaded) {
		if (source.provider === "mux") {
			fallback = muxPosterSource(source.playbackId, aspect, {
				time:
					posterTime ??
					video?.muxVideo?.data?.thumbTime ??
					DEFAULT_MUX_POSTER_TIME,
				tokens: source.tokens,
				customDomain: source.customDomain,
			})
		} else if (
			isIframe &&
			video?.thumbnail?.provider === source.provider &&
			video.thumbnail.url &&
			video.thumbnail.width &&
			video.thumbnail.height
		) {
			fallback = {
				src: video.thumbnail.url,
				width: video.thumbnail.width,
				height: video.thumbnail.height,
			}
		}
	}
	const missingPoster = mode !== "click" && !uploaded && !fallback
	useEffect(() => {
		if (missingPoster) devWarn("autoplay and background videos need a poster (an uploaded image, or a Mux or provider thumbnail); without one the slot is empty until the first frame and the video pops in")
	}, [missingPoster])
	const muxFallbackId = fallback && source.provider === "mux" ? source.playbackId : null
	useEffect(() => {
		if (!muxFallbackId || warnedMuxIds.has(muxFallbackId)) return
		warnedMuxIds.add(muxFallbackId)
		devWarn(
			"Mux thumbnails of untagged assets can differ in brightness from the video; upload a poster or re-encode",
		)
	}, [muxFallbackId])
	const awaitingPlay =
		mode === "click" &&
		state.status === "ready" &&
		state.wanted !== "play" &&
		controller.capabilities.play !== "no"
	const nativeChrome = controls === "provider" && !isIframe && playerMounted
	const posterVisible = (!framePresented || awaitingPlay || failed) && !nativeChrome
	const aspectCss = aspectRatioToCss(aspect)

	const showOverlay = !showFacade && (state.status === "blocked" || (suppressed && !userActivated))
	const showLoading =
		playerMounted &&
		!background &&
		((state.status === "loading" && state.wanted === "play") || state.waiting) &&
		!failed &&
		!(posterVisible && (uploaded || fallback))
	const showError = state.status === "error"
	const statusParts = (
		<>
			{showLoading ? <Loading /> : null}
			{showError ? <ErrorMessage /> : null}
		</>
	)
	let controlsContent: React.ReactNode = children
	if (controls === true) controlsContent = children ?? <DefaultControls />
	const showBackgroundPause = background && showPause && controls !== true

	const provider = source.provider
	return (
		<VideoContext
			value={{
				controller,
				capabilities: controller.capabilities,
				provider,
				mode,
				labels: mergedLabels,
				controlsPlacement: placement,
				playerMounted,
				label,
				media: mediaEl,
			}}
		>
			<VideoStateContext value={state}>
				<PartsContext value={{ labels: labels ?? {}, placement }}>
				<Root
					ref={setRootEl}
					className={className}
					data-universal-video=""
					data-provider={provider}
					data-mode={mode}
					data-status={state.status}
					role={label ? "group" : undefined}
					aria-label={label}
					placement={placement}
					aspectRatio={aspectCss}
				>
					<Stage placement={placement} aspectRatio={aspectCss}>
						<MediaLayer ref={setMediaEl} hidden={showError} />
						<Poster
							uploaded={uploaded}
							fallback={fallback}
							priority={priority}
							eager={eager}
							visible={posterVisible}
							passive={controls === "provider" && playerMounted}
						/>
						{showFacade ? (
							<Facade provider={source.provider} privacy={privacy} label={label} />
						) : null}
						{showOverlay ? <PlayOverlay /> : null}
						{statusParts}
						{placement === "overlay" ? controlsContent : null}
						{showBackgroundPause ? (
							<BackgroundPause>
								<PlayButton />
							</BackgroundPause>
						) : null}
					</Stage>
					{placement === "below" ? controlsContent : null}
					{mainContent && video ? <VideoJsonLd video={video} /> : null}
				</Root>
				</PartsContext>
			</VideoStateContext>
		</VideoContext>
	)
}

function debugCountMounted(delta: number) {
	debugCounters.mounted += delta
}

const Root = styled("div", {
	base: [
		{
			"@layer": {
				[library]: f.unresponsive(css`
					position: relative;
					isolation: isolate;
				`),
			},
		},
	],
	variants: {
		placement: {
			overlay: [
				{
					"@layer": {
						[library]: f.unresponsive(css`
							overflow: clip;
							aspect-ratio: ${aspectRatioVar};
						`),
					},
				},
			],
			below: [
				{
					"@layer": {
						[library]: f.unresponsive(css`
							display: flex;
							flex-direction: column;
						`),
					},
				},
			],
		},
	},
	defaultVariants: { placement: "overlay" },
	tokens: {
		aspectRatio: { token: aspectRatioVar },
	},
})

const Stage = styled("div", {
	variants: {
		placement: {
			overlay: [
				{
					"@layer": {
						[library]: f.unresponsive(css`
							position: absolute;
							inset: 0;
							overflow: clip;
						`),
					},
				},
			],
			below: [
				{
					"@layer": {
						[library]: f.unresponsive(css`
							position: relative;
							overflow: clip;
							aspect-ratio: ${aspectRatioVar};
						`),
					},
				},
			],
		},
	},
	defaultVariants: { placement: "overlay" },
	tokens: {
		aspectRatio: { token: aspectRatioVar },
	},
})

const MediaLayer = styled("div", [
	{
		"@layer": {
			[library]: f.unresponsive(css`
				position: absolute;
				inset: 0;

				& > * {
					position: absolute;
					inset: 0;
					display: block;
					width: 100%;
					height: 100%;
					border: 0;
					object-fit: cover;
					object-position: center;
					--media-object-fit: cover;
					--media-object-position: center;
				}

				& wistia-video [class~="wistia_embed"],
				& wistia-video .w-chrome,
				& wistia-video .w-video-wrapper {
					position: absolute !important;
					inset: 0;
					width: 100% !important;
					height: 100% !important;
					padding: 0 !important;
				}
			`),
		},
	},
])

const BackgroundPause = styled("div", [
	f.responsive(css`
		position: absolute;
		right: 16px;
		bottom: 16px;
	`),
])
