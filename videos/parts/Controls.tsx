"use client"

import { css, f, styled } from "library/styled"
import { useCombinedRefs } from "library/useCombinedRefs"
import type { VideoLabels } from "library/videos/types"
import { useContext, useEffect, useMemo, useRef, useState } from "react"
import { PartsContext } from "./context"
import type { PartProps } from "./types"
import { resolveChildren, usePart } from "./usePart"

export interface ControlsProps extends PartProps<"div"> {
	/** Where the controls sit. YouTube discourages overlaying its player, so "below" is available. Defaults to the surrounding UniversalVideo placement */
	placement?: "overlay" | "below"
	/** Label overrides for every part rendered inside. */
	labels?: Partial<VideoLabels>
	/** Milliseconds without input before data-idle is set while playing. Default 3000 */
	idleTimeout?: number
}

const ACTIVITY_EVENTS = [
	"pointermove",
	"pointerdown",
	"keydown",
	"focusin",
	"touchstart",
] as const

export function Controls({
	alwaysShow,
	children,
	placement: placementProp,
	labels,
	idleTimeout = 3000,
	ref,
	label: _label,
	...rest
}: ControlsProps) {
	const { state } = usePart([], alwaysShow)
	const [active, setActive] = useState(true)
	const innerRef = useRef<HTMLDivElement | null>(null)
	const combinedRef = useCombinedRefs(ref, innerRef)
	const parent = useContext(PartsContext)
	const placement = placementProp ?? parent.placement
	const parentLabels = parent.labels
	const value = useMemo(
		() => ({ labels: { ...parentLabels, ...labels }, placement }),
		[parentLabels, labels, placement],
	)

	useEffect(() => {
		const target = innerRef.current?.parentElement
		if (!target) return
		let timer = window.setTimeout(() => setActive(false), idleTimeout)
		const wake = () => {
			setActive(true)
			window.clearTimeout(timer)
			timer = window.setTimeout(() => setActive(false), idleTimeout)
		}
		for (const type of ACTIVITY_EVENTS)
			target.addEventListener(type, wake, { passive: true })
		return () => {
			window.clearTimeout(timer)
			for (const type of ACTIVITY_EVENTS) target.removeEventListener(type, wake)
		}
	}, [idleTimeout])

	const idle = state.status === "playing" && !active

	return (
		<PartsContext value={value}>
			<Container
				ref={combinedRef}
				data-placement={placement}
				data-state={state.status}
				data-idle={idle}
				{...rest}
			>
				{resolveChildren(children, state, null)}
			</Container>
		</PartsContext>
	)
}

const Container = styled(
	"div",
	f.unresponsive(css`
		display: flex;
		flex-direction: column;

		&[data-placement="overlay"] {
			position: absolute;
			inset: 0;
			justify-content: flex-end;
			pointer-events: none;
		}

		&[data-placement="overlay"] > * {
			pointer-events: auto;
		}
	`),
)
