import "hls-video-element"
import type { ProviderAdapterFactory } from "library/videos/types"
import { createFileFactory } from "./file"

export const factory: ProviderAdapterFactory = createFileFactory("hls-video")
