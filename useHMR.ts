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
							let parsedMessage: z.infer<NonNullable<typeof messageSchema>>
							try {
								parsedMessage = messageSchema!.parse(message)
							} catch (err) {
								throw new Error(
									`useHMR (library/useHMR.ts): WebSocket message from Next.js HMR does not match the expected schema.
` +
										`This usually means the Next.js version changed the HMR message format.
` +
										`Update the messageSchema in library/useHMR.ts to match the new format.
` +
										`Received message: ${JSON.stringify(message)}
` +
										`Original error: ${err}`,
								)
							}

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
				let rafId: number | null = null

				useHMR("prebuild", () => {
					if (rafId) cancelAnimationFrame(rafId)
					latestScroll.current = window.scrollY
				})

				useHMR("postbuild", () => {
					const startTime = performance.now()
					const scrollEveryFrame = () => {
						window.scrollTo({ top: latestScroll.current, behavior: "instant" })
						if (performance.now() - startTime < 1000) {
							rafId = requestAnimationFrame(scrollEveryFrame)
						}
					}
					scrollEveryFrame()
				})
			}
		: () => {}
