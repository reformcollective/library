import { VIDEO_FEATURES } from "library/videos/capabilities"
import type {
	AdapterEvent,
	ControllerInternals,
	ControllerOptions,
	ControllerProps,
	ProviderAdapter,
	ProviderCapabilities,
	ProviderExtras,
	VideoCallbacks,
	VideoFeature,
	VideoState,
} from "library/videos/types"
import type { ControllerEventMap } from "./events"
import { createInitialState, reduceAdapterEvent } from "./stateMachine"
import { applyManual, applyTrigger, release } from "./wanted"

export interface LifecycleController extends ControllerInternals {
	onRetry: (listener: () => void) => () => void
	onCommand: (
		listener: (event: ControllerEventMap["command"]) => void,
	) => () => void
}

interface Task {
	run: () => void
	done?: () => void
}

const EMPTY_EXTRAS: ProviderExtras = {}
const MAX_RETRIES = 2
const STALL_MS = 4000

function warn(message: string) {
	if (process.env.NODE_ENV !== "production") console.warn(`UniversalVideo: ${message}`)
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value))
}

export function createController(options: ControllerOptions): LifecycleController {
	const { provider, mode } = options
	let caps: ProviderCapabilities = { ...options.capabilities }
	let props: ControllerProps = { ...options.props }
	let callbacks: VideoCallbacks = {}
	const initialMuted = props.muted ?? mode !== "click"
	let state: VideoState = createInitialState(initialMuted)
	let adapter: ProviderAdapter | null = null
	let queue: Task[] = []
	let playInFlight = false
	let triggerClaims = 0
	let retryCount = 0
	let retryTimer: ReturnType<typeof setTimeout> | undefined
	let stallTimer: ReturnType<typeof setTimeout> | undefined
	let removeGesture: (() => void) | null = null
	let removeFullscreen: (() => void) | null = null
	const listeners = new Set<() => void>()
	const retryListeners = new Set<() => void>()
	const commandListeners = new Set<
		(event: ControllerEventMap["command"]) => void
	>()
	const extraListeners = new Map<string, Set<(detail: unknown) => void>>()

	function notify() {
		for (const listener of listeners) listener()
	}

	function commit(patch: Partial<VideoState>) {
		state = { ...state, ...patch }
		notify()
	}

	function announce(
		command: ControllerEventMap["command"]["command"],
		origin: ControllerEventMap["command"]["origin"],
	) {
		for (const listener of commandListeners) listener({ command, origin })
	}

	function allowed(feature: VideoFeature, command: string) {
		const support = caps[feature]
		if (support === "no" || support === "unverified") {
			warn(`${command} is not supported by ${provider}`)
			return false
		}
		return true
	}

	function runWhenReady(run: () => void, done?: () => void) {
		if (adapter && state.ready) {
			run()
			done?.()
			return
		}
		queue.push({ run, done })
	}

	function flush() {
		const tasks = queue
		queue = []
		for (const task of tasks) {
			task.run()
			task.done?.()
		}
	}

	function dropQueue() {
		const tasks = queue
		queue = []
		for (const task of tasks) task.done?.()
	}

	function settleQueue() {
		const tasks = queue
		queue = tasks.map((task) => ({ run: task.run }))
		for (const task of tasks) task.done?.()
	}

	function onPlayRejected(error: unknown) {
		const isError = error instanceof Error
		const name = isError ? error.name : ""
		if (name === "AbortError") return
		if (name === "NotAllowedError") {
			if (state.status !== "blocked") handle({ type: "blocked" })
			return
		}
		const message = isError ? error.message : "Playback failed"
		const code = name || "play"
		handle({
			type: "error",
			error: { code, message, retryable: false, provider },
		})
	}

	function settlePlay() {
		playInFlight = false
	}

	function startPlay(): Promise<void> {
		const current = adapter
		if (!current) return Promise.resolve()
		if (state.ended) current.seek(0)
		playInFlight = true
		return current.play().then(settlePlay, (error: unknown) => {
			settlePlay()
			onPlayRejected(error)
		})
	}

	function reconcile() {
		if (!adapter || !state.ready) return
		if (state.wanted === "play") {
			const skip =
				state.status === "playing" ||
				state.status === "blocked" ||
				(state.status === "ended" && state.wantedOrigin === "trigger") ||
				playInFlight
			if (!skip) void startPlay()
			return
		}
		if (state.wanted === "pause" && !state.paused) adapter.pause()
	}

	function setWanted(next: { wanted: VideoState["wanted"]; wantedOrigin: VideoState["wantedOrigin"] }) {
		if (
			next.wanted === state.wanted &&
			next.wantedOrigin === state.wantedOrigin
		)
			return
		commit(next)
	}

	function markManual() {
		setWanted({ wanted: state.wanted, wantedOrigin: "manual" })
	}

	function clearStall() {
		if (stallTimer) clearTimeout(stallTimer)
		stallTimer = undefined
	}

	function onStall() {
		stallTimer = undefined
		if (!state.waiting) return
		if (state.status === "playing") commit({ status: "stalled" })
	}

	function onGesture() {
		removeGesture?.()
		removeGesture = null
		if (state.status === "blocked" && state.wanted === "play") void startPlay()
	}

	function armGestureRetry() {
		if (removeGesture || typeof document === "undefined") return
		const options = { capture: true, once: true }
		document.addEventListener("pointerdown", onGesture, options)
		document.addEventListener("keydown", onGesture, options)
		removeGesture = () => {
			document.removeEventListener("pointerdown", onGesture, options)
			document.removeEventListener("keydown", onGesture, options)
		}
	}

	function scheduleRetry() {
		if (retryTimer) clearTimeout(retryTimer)
		const delay = 500 * 3 ** retryCount
		retryCount += 1
		retryTimer = setTimeout(() => {
			retryTimer = undefined
			for (const listener of retryListeners) listener()
		}, delay)
	}

	function handleTime(currentTime: number) {
		const end = props.endTime
		if (end === undefined || currentTime < end || state.status !== "playing")
			return
		if (props.loop) {
			adapter?.seek(props.startTime ?? 0)
			return
		}
		adapter?.pause()
		setWanted({ wanted: "pause", wantedOrigin: state.wantedOrigin })
	}

	function mergeCapabilities(partial: Partial<ProviderCapabilities>) {
		const next: ProviderCapabilities = { ...caps }
		for (const feature of VIDEO_FEATURES) {
			const value = partial[feature]
			if (value) next[feature] = value
		}
		caps = next
		commit({})
	}

	function handle(event: AdapterEvent) {
		if (event.type === "capabilities") {
			mergeCapabilities(event.capabilities)
			return
		}
		if (event.type === "extra") {
			const set = extraListeners.get(event.name)
			if (set) for (const listener of set) listener(event.detail)
			return
		}
		if (event.type === "error" && retryTimer) return
		const previous = state
		const willRetry =
			event.type === "error" &&
			event.error.retryable &&
			retryCount < MAX_RETRIES
		const patch = reduceAdapterEvent(state, event)
		if (willRetry) commit({ status: "loading", error: null, waiting: false })
		else commit(patch)

		switch (event.type) {
			case "ready":
				flush()
				reconcile()
				callbacks.onReady?.()
				break
			case "playing":
				clearStall()
				retryCount = 0
				playInFlight = false
				if (previous.status !== "playing") callbacks.onPlay?.()
				if (state.wanted === "pause" && state.wantedOrigin === "trigger") reconcile()
				break
			case "paused":
				clearStall()
				playInFlight = false
				if (previous.status === "playing" || previous.status === "stalled")
					callbacks.onPause?.()
				break
			case "waiting":
				if (!stallTimer) stallTimer = setTimeout(onStall, STALL_MS)
				break
			case "ended":
				clearStall()
				playInFlight = false
				callbacks.onEnded?.()
				break
			case "blocked":
				playInFlight = false
				armGestureRetry()
				if (previous.status !== "blocked") callbacks.onBlocked?.()
				break
			case "time":
				callbacks.onTimeUpdate?.(event.currentTime, state.duration)
				handleTime(event.currentTime)
				break
			case "error":
				clearStall()
				playInFlight = false
				if (willRetry) scheduleRetry()
				else callbacks.onError?.(event.error)
				break
			default:
				break
		}
	}

	function attach(next: ProviderAdapter) {
		adapter = next
		if (typeof document === "undefined") return
		const onChange = () => {
			const container = adapter?.element.closest("[data-universal-video]")
			commit({
				fullscreen: !!container && document.fullscreenElement === container,
			})
		}
		document.addEventListener("fullscreenchange", onChange)
		removeFullscreen = () =>
			document.removeEventListener("fullscreenchange", onChange)
	}

	function detach() {
		clearStall()
		if (retryTimer) clearTimeout(retryTimer)
		retryTimer = undefined
		removeGesture?.()
		removeGesture = null
		removeFullscreen?.()
		removeFullscreen = null
		const current = adapter
		adapter = null
		playInFlight = false
		settleQueue()
		current?.destroy()
		if (current)
			commit({
				status: "idle",
				ready: false,
				paused: true,
				waiting: false,
				fullscreen: false,
			})
	}

	function destroy() {
		detach()
		dropQueue()
		listeners.clear()
		retryListeners.clear()
		commandListeners.clear()
		extraListeners.clear()
	}

	function play(opts?: { origin?: "user" | "external" }): Promise<void> {
		const origin = opts?.origin ?? "external"
		announce("play", origin)
		if (!allowed("play", "play")) return Promise.resolve()
		setWanted(applyManual(state, "play"))
		if (adapter && state.ready) return startPlay()
		return new Promise<void>((resolve) => {
			queue.push({
				run: () => {
					if (state.wanted === "play") void startPlay()
				},
				done: resolve,
			})
		})
	}

	function pause(opts?: { origin?: "user" | "external" }) {
		announce("pause", opts?.origin ?? "external")
		setWanted(applyManual(state, "pause"))
		runWhenReady(() => adapter?.pause())
	}

	function toggle() {
		const playing =
			state.status !== "blocked" && (state.wanted === "play" || !state.paused)
		if (playing) pause({ origin: "user" })
		else void play({ origin: "user" })
	}

	function seek(seconds: number) {
		announce("seek", "external")
		if (!allowed("seek", "seek")) return
		const max = state.duration > 0 ? state.duration : Number.POSITIVE_INFINITY
		const target = clamp(seconds, 0, max)
		markManual()
		commit({ currentTime: target })
		runWhenReady(() => adapter?.seek(target))
	}

	function restart() {
		announce("restart", "external")
		seek(0)
		void play({ origin: "external" })
	}

	function setMuted(muted: boolean) {
		announce("setMuted", "external")
		if (!allowed("muted", "setMuted")) return
		markManual()
		commit({ muted })
		runWhenReady(() => adapter?.setMuted(muted))
	}

	function setVolume(volume: number) {
		announce("setVolume", "external")
		if (!allowed("volume", "setVolume")) return
		const value = clamp(volume, 0, 1)
		commit({ volume: value })
		runWhenReady(() => adapter?.setVolume?.(value))
	}

	function setPlaybackRate(rate: number) {
		announce("setPlaybackRate", "external")
		if (!allowed("playbackRate", "setPlaybackRate")) return
		runWhenReady(() => adapter?.setPlaybackRate?.(rate))
	}

	function setTextTrack(id: string | null) {
		announce("setTextTrack", "external")
		if (!allowed("captions", "setTextTrack")) return
		commit({ activeTextTrack: id })
		runWhenReady(() => adapter?.setTextTrack?.(id))
	}

	function setAudioTrack(id: string) {
		announce("setAudioTrack", "external")
		if (!allowed("audioTracks", "setAudioTrack")) return
		commit({ activeAudioTrack: id })
		runWhenReady(() => adapter?.setAudioTrack?.(id))
	}

	function setQuality(id: string | null) {
		announce("setQuality", "external")
		if (caps.qualitySelect === "no" || caps.qualitySelect === "unverified") {
			if (!allowed("qualityCap", "setQuality")) return
		}
		commit({ activeQuality: id })
		runWhenReady(() => adapter?.setQuality?.(id))
	}

	function setChapter(index: number) {
		announce("setChapter", "external")
		const chapter = state.chapters[index]
		if (!chapter) return
		seek(chapter.startTime)
	}

	function findContainer() {
		return adapter?.element.closest("[data-universal-video]") ?? null
	}

	async function requestFullscreen() {
		announce("requestFullscreen", "external")
		const container = findContainer()
		if (!container || !allowed("fullscreen", "requestFullscreen")) return
		await container.requestFullscreen()
	}

	async function exitFullscreen() {
		announce("exitFullscreen", "external")
		if (typeof document === "undefined" || !document.fullscreenElement) return
		await document.exitFullscreen()
	}

	async function requestPictureInPicture() {
		announce("requestPictureInPicture", "external")
		if (!allowed("pip", "requestPictureInPicture")) return
		await adapter?.requestPictureInPicture?.()
	}

	async function promptRemotePlayback() {
		announce("promptRemotePlayback", "external")
		if (!allowed("remotePlayback", "promptRemotePlayback")) return
		await adapter?.promptRemotePlayback?.()
	}

	function releaseManualControl() {
		setWanted(release(state))
	}

	function retry() {
		announce("retry", "external")
		retryCount = 0
		if (retryTimer) clearTimeout(retryTimer)
		retryTimer = undefined
		commit({ status: "loading", error: null })
		for (const listener of retryListeners) listener()
	}

	function onExtra(name: string, listener: (detail: unknown) => void) {
		const set = extraListeners.get(name) ?? new Set()
		set.add(listener)
		extraListeners.set(name, set)
		return () => {
			set.delete(listener)
		}
	}

	return {
		attach,
		detach,
		handle,
		destroy,
		setCallbacks(next) {
			callbacks = next
		},
		setProps(next) {
			const previous = props
			props = { ...next }
			if (next.muted !== undefined && next.muted !== previous.muted) {
				commit({ muted: next.muted })
				runWhenReady(() => adapter?.setMuted(next.muted === true))
			}
			if (next.loop !== undefined && next.loop !== previous.loop)
				runWhenReady(() => adapter?.setLoop?.(next.loop === true))
		},
		playFromTrigger() {
			announce("play", "trigger")
			const next = applyTrigger(state, "play")
			if (next === state) return
			setWanted(next)
			reconcile()
		},
		pauseFromTrigger() {
			announce("pause", "trigger")
			const next = applyTrigger(state, "pause")
			if (next === state) return
			setWanted(next)
			reconcile()
		},
		claimTrigger() {
			triggerClaims += 1
			commit({})
			let released = false
			return () => {
				if (released) return
				released = true
				triggerClaims -= 1
				commit({})
			}
		},
		get triggerClaimed() {
			return triggerClaims > 0
		},
		play,
		pause,
		toggle,
		restart,
		seek,
		seekBy(delta) {
			seek(state.currentTime + delta)
		},
		setMuted,
		setVolume,
		setPlaybackRate,
		setTextTrack,
		setAudioTrack,
		setQuality,
		setChapter,
		requestFullscreen,
		exitFullscreen,
		requestPictureInPicture,
		promptRemotePlayback,
		releaseManualControl,
		retry,
		onExtra,
		getState: () => state,
		subscribe(listener) {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		get capabilities() {
			return caps
		},
		get extras() {
			return adapter?.extras ?? EMPTY_EXTRAS
		},
		onRetry(listener) {
			retryListeners.add(listener)
			return () => {
				retryListeners.delete(listener)
			}
		},
		onCommand(listener) {
			commandListeners.add(listener)
			return () => {
				commandListeners.delete(listener)
			}
		},
	}
}
