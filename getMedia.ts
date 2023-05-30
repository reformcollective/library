import {
  desktopAspectRatio as desktop,
  tabletAspectRatio as tablet,
  mobileAspectRatio as mobile,
} from "styles/media"

export default function getMedia<Type>(fw: Type, d: Type, t: Type, m: Type) {
  if (typeof window !== "undefined") {
    const aspectRatio = window.innerWidth / window.innerHeight
    if (aspectRatio <= mobile) {
      return m
    }
    if (aspectRatio <= tablet) {
      return t
    }
    if (aspectRatio <= desktop) {
      return d
    }
    if (aspectRatio > desktop) {
      return fw
    }
  }

  return d
}
