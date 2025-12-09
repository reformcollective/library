import MuxVideoComponent from "@mux/mux-video-react"
import type { ComponentProps, Ref } from "react"

export function MuxVideo({
	ref,
	...props
}: ComponentProps<typeof MuxVideoComponent> & {
	ref?: Ref<HTMLVideoElement>
}) {
	return (
		<MuxVideoComponent
			ref={ref}
			preferPlayback="mse"
			renditionOrder="desc"
			_hlsConfig={{
				backBufferLength: 0,
			}}
			{...props}
		/>
	)
}
