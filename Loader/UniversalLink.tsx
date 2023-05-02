import { Link } from "gatsby"
import libraryConfig from "libraryConfig"
import { MouseEventHandler } from "react"

import { Transitions } from "."
import { loadPage } from "./TransitionUtils"

export interface UniversalLinkProps {
  /**
   * the page to navigate to when clicked
   */
  to?: string
  /**
   * the transition to use when navigating
   */
  transition?: Transitions
  openInNewTab?: boolean
  children: React.ReactNode
  className?: string
  onMouseEnter?: MouseEventHandler
  onMouseLeave?: MouseEventHandler
  onClick?: MouseEventHandler
  type?: "submit"
  forwardRef?: React.Ref<HTMLAnchorElement & HTMLButtonElement & Link<unknown>>
  ariaLabel?: string
}

/**
 * a link that navigates when clicked, using the specified transition
 * @returns
 */
export default function UniversalLink({
  to = "",
  transition = libraryConfig.defaultTransition,
  openInNewTab = false,
  children,
  className = "",
  onMouseEnter,
  onMouseLeave,
  onClick,
  type,
  forwardRef,
  ariaLabel,
}: UniversalLinkProps) {
  const internal = /^\/(?!\/)/.test(to)

  const handleClick: React.MouseEventHandler = e => {
    e.preventDefault()

    if (openInNewTab || !internal) {
      window.open(to, "_blank")
    } else {
      loadPage(to, transition).catch((error: string) => {
        throw new Error(error)
      })
    }
  }

  if (onClick || type) {
    return (
      <button
        className={className}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        type={type === "submit" ? "submit" : "button"}
        ref={forwardRef}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    )
  }

  return internal ? (
    <Link
      to={to}
      onClick={handleClick}
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={forwardRef}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  ) : (
    <a
      href={to}
      onClick={handleClick}
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={forwardRef}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  )
}
