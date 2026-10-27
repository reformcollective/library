"use client"

import { css, f, styled } from "library/styled"
import { PlayOverlay } from "library/videos/parts/PlayOverlay"
import type { VideoProvider } from "library/videos/types"
import type { ReactNode } from "react"
import { preconnectProvider } from "./preconnect"

export interface FacadeProps {
	/** Provider whose player origins are preconnected on pointer enter or focus. */
	provider: VideoProvider
	/** Preconnect the nocookie YouTube origin. */
	privacy?: boolean
	/** Accessible name for the play button. Defaults to the playOverlay label. */
	label?: string
	className?: string
	/** The poster, rendered unmodified behind the play button. Must be rendered under UniversalVideo. */
	children?: ReactNode
}

export function Facade({
	provider,
	privacy,
	label,
	className,
	children,
}: FacadeProps) {
	const warm = () => {
		preconnectProvider(provider, privacy)
	}

	return (
		<Root
			className={className}
			data-provider={provider}
			onPointerEnter={warm}
			onFocus={warm}
		>
			{children}
			<PlayOverlay label={label} />
		</Root>
	)
}

const Root = styled(
	"div",
	f.unresponsive(css`
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	`),
)
