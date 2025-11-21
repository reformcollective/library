import MuxVideoComponent from "@mux/mux-video-react"
import type { ComponentProps } from "react"

export function MuxVideo(props: ComponentProps<typeof MuxVideoComponent>) {
	return <MuxVideoComponent {...props} />
}