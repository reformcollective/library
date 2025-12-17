import { useLatest } from "ahooks"
import { useEffect } from "react"

const socket =
	process.env.NODE_ENV === "development"
		? new WebSocket("ws://localhost:3000/_next/webpack-hmr")
		: null

export const useHMR = (callback: (hash: string) => void) => {
	const latestCallback = useLatest(callback)

	useEffect(() => {
		if (process.env.NODE_ENV === "development") {
			const handler = (event: MessageEvent) => {
				const message = JSON.parse(event.data) as
					| { type: "unknown" }
					| { type: "built"; hash: string }
				if (message.type === "built") {
					console.log("HMR hash updated:", message.hash)
					latestCallback.current(message.hash)
				}
			}
			socket?.addEventListener("message", handler)
			return () => {
				socket?.removeEventListener("message", handler)
			}
		}
	}, [latestCallback])
}
