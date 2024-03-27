import { useEffect } from "react"

type Listener<T extends unknown[]> = (...args: T) => void

export default class TypedEventEmitter<
	EventMap extends Record<string, unknown[]>,
> {
	private eventListeners: {
		[K in keyof EventMap]?: Set<Listener<EventMap[K]>>
	} = {}

	public addEventListener<K extends keyof EventMap>(
		eventName: K,
		listener: Listener<EventMap[K]>,
	) {
		const listeners = this.eventListeners[eventName] ?? new Set()
		listeners.add(listener)
		this.eventListeners[eventName] = listeners
	}

	public removeEventListener<K extends keyof EventMap>(
		eventName: K,
		listener: Listener<EventMap[K]>,
	) {
		const listeners = this.eventListeners[eventName] ?? new Set()
		listeners.delete(listener)
		this.eventListeners[eventName] = listeners
	}

	public dispatchEvent<K extends keyof EventMap>(
		eventName: K,
		...args: EventMap[K]
	) {
		const listeners = this.eventListeners[eventName] ?? new Set()
		for (const listener of listeners) {
			listener(...args)
		}
	}

	public useEventListener<K extends keyof EventMap>(
		eventName: K,
		listener: Listener<EventMap[K]>,
	) {
		useEffect(() => {
			this.addEventListener(eventName, listener)
			return () => {
				this.removeEventListener(eventName, listener)
			}
		}, [eventName, listener])
	}
}
