import { css, f, styled } from "library/styled"
import type { Ref } from "react"

export function ScrubCanvas({
	canvasRef,
	fit,
	alt,
	className,
}: {
	canvasRef: Ref<HTMLCanvasElement>
	fit: "cover" | "contain" | "fill"
	alt: string
	className?: string
}) {
	return (
		<Wrapper className={className}>
			<Canvas
				ref={canvasRef}
				fit={fit}
				role={alt ? "img" : undefined}
				aria-label={alt || undefined}
				aria-hidden={alt ? undefined : true}
			/>
		</Wrapper>
	)
}

const Wrapper = styled("div", [
	f.unresponsive(css`
		position: relative;
		width: 100%;
		height: 100%;
		pointer-events: none;
	`),
])

const Canvas = styled("canvas", {
	base: [
		f.unresponsive(css`
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
		`),
	],
	variants: {
		fit: {
			cover: [f.unresponsive(css`object-fit: cover;`)],
			contain: [f.unresponsive(css`object-fit: contain;`)],
			fill: [f.unresponsive(css`object-fit: fill;`)],
		},
	},
	defaultVariants: { fit: "cover" },
})
