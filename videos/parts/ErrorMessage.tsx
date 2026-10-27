"use client"

import { css, f, styled } from "library/styled"
import { buttonBase } from "./styles.css"
import type { PartProps } from "./types"
import { resolveChildren, usePart } from "./usePart"

export interface ErrorMessageProps extends PartProps<"div"> {
	/** Show the retry button when the error is retryable. Default true */
	showRetry?: boolean
}

export function ErrorMessage({
	label,
	alwaysShow,
	children,
	showRetry = true,
	...rest
}: ErrorMessageProps) {
	const { state, controller, placement, visible, text } = usePart([], alwaysShow)
	if (!visible || (!state.error && !alwaysShow)) return null

	const message = label ?? text("errorGeneric")
	const canRetry = showRetry && state.error?.retryable === true

	return (
		<Box role="alert" data-placement={placement} data-state={state.status} {...rest}>
			{resolveChildren(
				children,
				state,
				<>
					<span>{message}</span>
					{canRetry && (
						<RetryButton type="button" onClick={() => controller.retry()}>
							{text("retry")}
						</RetryButton>
					)}
				</>,
			)}
		</Box>
	)
}

const Box = styled(
	"div",
	f.unresponsive(css`
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;

		&[data-placement="overlay"] {
			position: absolute;
			inset: 0;
		}
	`),
)

const RetryButton = styled(
	"button",
	f.unresponsive(css`
		${buttonBase}
		font-size: inherit;
		padding: 0 8px;
	`),
)
