import { debugCounters } from "./concurrency"

export interface ObserveOptions {
	rootMargin?: string
	threshold?: number | number[]
}

type Callback = (entry: IntersectionObserverEntry) => void

interface Pool {
	observer: IntersectionObserver
	targets: Map<Element, Set<Callback>>
	latest: Map<Element, IntersectionObserverEntry>
}

const pools = new Map<string, Pool>()

function poolKey(options: ObserveOptions) {
	const threshold = Array.isArray(options.threshold)
		? options.threshold.join(",")
		: String(options.threshold ?? 0)
	return `${options.rootMargin ?? "0px"}|${threshold}`
}

function getPool(key: string, options: ObserveOptions): Pool {
	const existing = pools.get(key)
	if (existing) return existing
	const targets = new Map<Element, Set<Callback>>()
	const latest = new Map<Element, IntersectionObserverEntry>()
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				latest.set(entry.target, entry)
				const callbacks = targets.get(entry.target)
				if (callbacks) for (const callback of callbacks) callback(entry)
			}
		},
		{
			rootMargin: options.rootMargin ?? "0px",
			threshold: options.threshold ?? 0,
		},
	)
	const pool = { observer, targets, latest }
	pools.set(key, pool)
	debugCounters.observers += 1
	return pool
}

/** Observes an element through a module-level IntersectionObserver shared by every video with the same options. Client only. */
export function observeShared(
	element: Element,
	options: ObserveOptions,
	callback: Callback,
): () => void {
	const key = poolKey(options)
	const pool = getPool(key, options)
	const callbacks = pool.targets.get(element) ?? new Set<Callback>()
	if (callbacks.size === 0) pool.observer.observe(element)
	callbacks.add(callback)
	pool.targets.set(element, callbacks)
	// An element that is already observed with these options gets no initial notification, so replay the last one.
	let cancelled = false
	if (pool.latest.has(element)) {
		queueMicrotask(() => {
			const current = pool.latest.get(element)
			if (!cancelled && current && callbacks.has(callback)) callback(current)
		})
	}
	return () => {
		cancelled = true
		callbacks.delete(callback)
		if (callbacks.size > 0) return
		pool.targets.delete(element)
		pool.latest.delete(element)
		pool.observer.unobserve(element)
		if (pool.targets.size === 0) {
			pool.observer.disconnect()
			pools.delete(key)
			debugCounters.observers -= 1
		}
	}
}
