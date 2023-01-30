import { useEffect, useRef, useState } from "react"

import ScrollSmoother from "gsap/ScrollSmoother"

import { onUnmount, pageReady } from "library/pageReady"

interface ScrollProps {
  children: React.ReactNode
}

/**
 * shorthand for pins, which selects "fixed" if scroller is off and "transform"
 * if scroller is on
 */
export const usePinType = () => {
  const isSmooth = useIsSmooth()
  return isSmooth ? "transform" : "fixed"
}

/**
 * returns true if ScrollSmoother is enabled
 */
export const useIsSmooth = () => {
  const [smooth, setSmooth] = useState(
    typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches
  )

  useEffect(() => {
    const enableSmooth = () => {
      setSmooth(true)
    }
    const disableSmooth = () => {
      setSmooth(false)
    }

    window.addEventListener("wheel", enableSmooth, { passive: true })
    window.addEventListener("touchstart", disableSmooth, { passive: true })

    return () => {
      window.removeEventListener("wheel", enableSmooth)
      window.removeEventListener("touchstart", disableSmooth)
    }
  }, [])

  // if the device is mobile, set the initial value to false
  useEffect(() => {
    const hover = window.matchMedia("(hover: hover)")
    if (!hover.matches) {
      setSmooth(false)
    }
  }, [])

  return smooth
}

export default function Scroll({ children }: ScrollProps) {
  const isSmooth = useIsSmooth()
  const isPaused = useRef(true)
  const [refreshSignal, setRefreshSignal] = useState(0)

  /**
   * create the smoother
   */
  useEffect(() => {
    const smoother = ScrollSmoother.create({
      smooth: isSmooth ? 1 : 0,
      smoothTouch: isSmooth ? 1 : 0,
      // save compute on mobile by ignoring resize (triggers shouldn't depend on innerHeight anyway)
      ignoreMobileResize: true,
      onUpdate: e => {
        // if at the top, enable overscroll behavior (pull to refresh)
        const maxScroll = document.body.scrollHeight - window.innerHeight
        if (e.scrollTop() === 0 || maxScroll - e.scrollTop() < 100) {
          document.body.style.overscrollBehaviorY = "auto"
          document.documentElement.style.overscrollBehaviorY = "auto"
        } else {
          document.body.style.overscrollBehaviorY = "none"
          document.documentElement.style.overscrollBehaviorY = "none"
        }
        // always allow sideways overscroll (forward/back usually)
        document.body.style.overscrollBehaviorX = "auto"
        document.documentElement.style.overscrollBehaviorX = "auto"
      },
    })

    setTimeout(() => {
      // persist paused state across re-renders
      smoother.paused(isPaused.current)
    }, 0)

    return () => {
      isPaused.current = smoother.paused()
      smoother.kill()
    }
  }, [isSmooth, refreshSignal])

  /**
   * kill the smoother when back/forward buttons are pressed
   */
  useEffect(() => {
    const killSmoother = () => {
      const smoother = ScrollSmoother.get()
      if (smoother) smoother.kill()

      // we want to wait for the *next* page to be ready before refreshing
      onUnmount(() => {
        pageReady()
          .then(() => {
            setRefreshSignal(s => s + 1)
          })
          .catch(() => {
            setRefreshSignal(s => s + 1)
          })
      })
    }

    window.addEventListener("popstate", killSmoother)
    return () => {
      window.removeEventListener("popstate", killSmoother)
    }
  }, [])

  return (
    <div id="smooth-wrapper">
      <div id="smooth-content">{children}</div>
    </div>
  )
}
