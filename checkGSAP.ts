import gsap from "gsap"

export interface PackageResponse {
  "dist-tags": DistTags
}

export interface DistTags {
  latest: string
  next: string
}

let hasWarned = false

const runCheck = async () => {
  if (process.env.NODE_ENV === "development") {
    // fetch the latest version metadata
    const data = await fetch("https://registry.npmjs.org/gsap")
      .then(response => response.json())
      .then(d => d as PackageResponse)

    // get the latest version
    const latestVersion = data["dist-tags"].latest
    // get the current version
    const currentVersion = gsap.version

    // if the versions are different, let us know
    if (latestVersion !== currentVersion && !hasWarned) {
      hasWarned = true
      console.warn(
        `You are using GSAP version ${currentVersion}, but the latest version is ${latestVersion}`,
      )
    }
  }
}

export const checkGSAP = () => {
  runCheck().catch(error => {
    console.error("Could not check for GSAP updates", error)
  })
}
