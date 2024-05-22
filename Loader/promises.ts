import { sleep } from "library/functions"

const promisesToAwait: Promise<unknown>[] = []

const recursiveAllSettled = async (
	promises: Promise<unknown>[],
	promisesToExclude: Promise<unknown>[] = [],
): Promise<void> => {
	const promisesCopy = [...promises].filter(
		(promise) => !promisesToExclude.includes(promise),
	)
	if (promisesCopy.length === 0) return

	await Promise.allSettled(promisesCopy)
	await recursiveAllSettled(promises, [...promisesToExclude, ...promisesCopy])
	promisesToAwait.length = 0
}

/**
 * wait for a promise to settle before transitioning to the next page
 * useful for waiting on a file, such as a video, to load
 * @param promise promise to await
 */
export function loaderAwaitPromise(promise: Promise<unknown>) {
	promisesToAwait.push(Promise.race([promise, sleep(10_000)]))
}

export function allLoaderPromisesSettled() {
	return recursiveAllSettled(promisesToAwait)
}
