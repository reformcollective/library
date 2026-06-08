import { dispatcher } from "next/dist/compiled/next-devtools"
import type { Dispatcher } from "next/dist/next-devtools/dev-overlay.browser"
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useEffectEvent,
} from "react"
import { isBrowser } from "./deviceDetection"
import TypedEventEmitter from "./TypedEventEmitter"

const nextDispatcher = dispatcher as Dispatcher
const js = String.raw

let hmrMessageId = 0

const createHMRMessageId = () =>
	`${Date.now().toString(36)}-${(hmrMessageId++).toString(36)}-${Math.random().toString(36).slice(2)}`

const emitter = new TypedEventEmitter<{
	beforeRefresh: [string]
	afterRefresh: [string]
}>()

declare global {
	interface Window {
		__reformHMREmitter: typeof emitter
		__reformHMRCreateId: typeof createHMRMessageId
	}
}

if (isBrowser) {
	window.__reformHMREmitter = emitter
	window.__reformHMRCreateId = createHMRMessageId
	const previousOnBeforeRefresh = nextDispatcher.onBeforeRefresh
	nextDispatcher.onBeforeRefresh = () => {
		previousOnBeforeRefresh()
		emitter.dispatchEvent("beforeRefresh", createHMRMessageId())
	}
}

const HMRContext = createContext(false)

const wsPatchScript = js`
	if (!window.__reformHMRPatched) {
		window.__reformHMRPatched = true;
		const originalWebSocket = window.WebSocket;
		window.WebSocket = function(...args) {
			const ws = new originalWebSocket(...args);
			const originalSend = ws.send.bind(ws);
			ws.send = function(data) {
				try {
					const msg = JSON.parse(data);
					if (msg.event === 'client-success') {
						window.__reformHMREmitter.dispatchEvent('afterRefresh', window.__reformHMRCreateId());
					}
				} catch(e) {}
				return originalSend(data);
			};
			return ws;
		};
		window.WebSocket.prototype = originalWebSocket.prototype;
	}
`

export const HMRProvider =
	process.env.NODE_ENV === "development"
		? ({ children }: { children: ReactNode }) => {
				useEffect(() => {
					const handleBeforeUnload = () => {
						emitter.dispatchEvent("beforeRefresh", createHMRMessageId())
					}
					window.addEventListener("beforeunload", handleBeforeUnload)
					return () =>
						window.removeEventListener("beforeunload", handleBeforeUnload)
				}, [])

				return (
					<HMRContext.Provider value={true}>
						<script>{wsPatchScript}</script>
						{children}
					</HMRContext.Provider>
				)
			}
		: ({ children }: { children: ReactNode }) => <>{children}</>

export const useHMR =
	process.env.NODE_ENV === "development"
		? (
				type: "beforeRefresh" | "afterRefresh",
				callback: (hash: string) => void,
			) => {
				if (!useContext(HMRContext))
					throw new Error("useHMR requires HMRProvider")
				const sendMessage = useEffectEvent(callback)

				useEffect(() => {
					const handler = (id: string) => sendMessage(id)
					emitter.addEventListener(type, handler)
					return () => emitter.removeEventListener(type, handler)
				}, [type])
			}
		: () => {}
