"use client"

import { usePathname } from "next/navigation"
import { createContext, Suspense, use, useEffect, useState } from "react"

const SafePathnameContext = createContext<string | null>(null)

function PathnameReporter({
	onPathname,
}: {
	onPathname: (pathname: string) => void
}) {
	const pathname = usePathname()
	useEffect(() => {
		onPathname(pathname)
	}, [pathname, onPathname])
	return null
}

/**
 * isolates the usePathname() read in its own Suspense boundary so that consumers
 * of `useSafePathname` don't force the rest of the tree to bail out of static
 * prerendering. Render this once, near the root of the app (e.g. alongside other
 * global providers) — everything that needs `useSafePathname` must be nested inside.
 */
export function SafePathnameProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const [pathname, setPathname] = useState<string | null>(null)

	return (
		<SafePathnameContext.Provider value={pathname}>
			<Suspense>
				<PathnameReporter onPathname={setPathname} />
			</Suspense>
			{children}
		</SafePathnameContext.Provider>
	)
}

/**
 * Reads the current pathname without ever blocking static prerendering.
 *
 * Use this instead of `next/navigation`'s `usePathname()` when you only need the
 * pathname to react to client-side navigation (e.g. as a `useEffect` dependency) and
 * don't need the correct value during the initial server render — `usePathname()`
 * reads request-scoped routing data, which Next.js treats as uncached/dynamic during
 * static prerendering, failing the build unless the calling component is wrapped in
 * its own `<Suspense>` boundary. Requires `<SafePathnameProvider>` to be rendered once
 * near the root of the app.
 *
 * Returns `null` until the client-rendered pathname is available.
 */
export default function useSafePathname() {
	return use(SafePathnameContext)
}
