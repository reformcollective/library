const calculateSupport = () => {
  const elem =
    typeof document === "undefined" ? null : document.createElement("canvas")

  if (elem?.getContext && elem.getContext("2d")) {
    // was able or not to get WebP representation
    return elem.toDataURL("image/webp").startsWith("data:image/webp")
  }

  // very old browser like IE 8, canvas not supported
  return false
}

const supportsWebp = calculateSupport()

export default supportsWebp
