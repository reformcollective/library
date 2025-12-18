import { useEffect, useEffectEvent, useRef } from "react"
import { z } from "zod"

const socket =
	process.env.NODE_ENV === "development"
		? new WebSocket("ws://localhost:3000/_next/webpack-hmr")
		: null

const messageSchema =
	process.env.NODE_ENV === "development"
		? z.union([
				z.strictObject({
					type: z.literal("built"),
					hash: z.string(),
					errors: z.array(z.unknown()),
					warnings: z.array(z.unknown()),
				}),
				z.strictObject({
					type: z.literal("building"),
				}),
				// unused messages
				z.object({
					type: z.enum([
						"serverComponentChanges",
						"turbopack-connected",
						"turbopack-message",
						"isrManifest",
						"sync",
					]),
				}),
			])
		: null

export const useHMR =
	process.env.NODE_ENV === "development"
		? (type: "prebuild" | "postbuild", callback: (hash: string) => void) => {
				const sendMessage = useEffectEvent(callback)

				useEffect(() => {
					if (process.env.NODE_ENV === "development") {
						const handler = (event: MessageEvent) => {
							const message = JSON.parse(event.data)
							const parsedMessage = messageSchema?.parse(message)

							if (!parsedMessage) throw new Error("Invalid message")

							if (type === "prebuild" && parsedMessage.type === "building") {
								sendMessage("building")
							}
							if (type === "postbuild" && parsedMessage.type === "built") {
								sendMessage(parsedMessage.hash)
							}
						}
						socket?.addEventListener("message", handler)
						return () => {
							socket?.removeEventListener("message", handler)
						}
					}
				}, [type])
			}
		: () => {}

export const useSteadyHotScroll =
	process.env.NODE_ENV === "development"
		? () => {
				const latestScroll = useRef(0)
				let latestScrollTimeout: NodeJS.Timeout | null = null

				useHMR("prebuild", () => {
					if (latestScrollTimeout) clearTimeout(latestScrollTimeout)
					latestScroll.current = window.scrollY
				})

				useHMR("postbuild", () => {
					latestScrollTimeout = setTimeout(() => {
						window.scrollTo({ top: latestScroll.current, behavior: "instant" })
					}, 100)
				})
			}
		: () => {}
