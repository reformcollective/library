import { useEffect } from "react"

type Listener<T extends unknown[]> = (...args: T) => void

export default class TypedEventEmitter<
	EventMap extends Record<string, unknown[]>,
> {
	private eventListeners: {
		[K in keyof EventMap]?: Set<Listener<EventMap[K]>>
	} = {}
	private mostRecentEvent:
		| {
				[K in keyof EventMap]?: {
					name: K
					args: EventMap[K]
				}
		  }[keyof EventMap]
		| null = null
	private triggerHappyEvents: (keyof EventMap)[]

	public constructor(triggerHappyEvents?: (keyof EventMap)[]) {
		this.triggerHappyEvents = triggerHappyEvents ?? []
	}

	public addEventListener<K extends keyof EventMap>(
		eventName: K,
		listener: Listener<EventMap[K]>,
	) {
		const listeners = this.eventListeners[eventName] ?? new Set()
		listeners.add(listener)
		this.eventListeners[eventName] = listeners

		// if this event is a happy event and the most recent event is the same type, fire it immediately
		if (
			this.triggerHappyEvents.includes(eventName) &&
			this.mostRecentEvent?.name === eventName
		) {
			listener(...(this.mostRecentEvent.args as EventMap[K]))
		}
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
		this.mostRecentEvent = { name: eventName, args }
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
