import {
  desktopBreakpoint as desktop,
  mobileBreakpoint as mobile,
  tabletBreakpoint as tablet,
} from "styles/media"

export default function getMedia<Type>(fw: Type, d: Type, t: Type, m: Type) {
  if (typeof window !== "undefined") {
    if (window.innerWidth > desktop) {
      return fw
    }
    if (window.innerWidth > tablet) {
      return d
    }
    if (window.innerWidth > mobile) {
      return t
    }
    if (window.innerWidth <= mobile) {
      return m
    }
  }

  return d
}
