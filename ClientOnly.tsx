import { startTransition, useEffect, useState } from "react"

import { isBrowser } from "./functions"

export default function ClientOnly({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    startTransition(() => {
      setMounted(isBrowser())
    })
  }, [])

  if (!mounted) return null

  return <>{children}</>
}
