import type { VideoState } from "library/videos/types"
import type { ComponentPropsWithRef, ReactNode } from "react"

export type PartChildren = ReactNode | ((state: VideoState) => ReactNode)

export interface PartOwnProps {
	/** Accessible name. Defaults to the matching entry in `labels`. */
	label?: string
	/** Render even when the source does not support this feature. */
	alwaysShow?: boolean
	/** Replaces the default content. A function receives the current video state. */
	children?: PartChildren
}

export type PartProps<
	Tag extends "button" | "div" | "input" | "select" | "span" | "time",
> = Omit<ComponentPropsWithRef<Tag>, "children"> & PartOwnProps
