import { browserData } from "library/deviceDetection"
import { useBrowserData } from "library/deviceDetection/react"
import { css, f, styled } from "library/styled"
import { useVH } from "library/viewportUtils"
import {
	type CSSProperties,
	type ReactNode,
	type Ref,
	useImperativeHandle,
	useRef,
} from "react"

export const useSafariOversizeHeight = () => {
	const screenHeight = useVH(100)
	if (!browserData.isIOS) return undefined
	if (!screenHeight) return undefined

	/* the maximum potential size of the viewport boundary */
	const boundarySize = window.outerHeight - screenHeight
	return screenHeight + boundarySize * 2
}

/**
 * an element that fills the viewport, including overflow on safari
 *
 * NOTE: you shouldn't animate this with percentage values, because the two elements are different sizes.
 */
export function FullViewport({
	ref,
	children,
	className,
	style,
}: {
	className?: string
	style?: CSSProperties
	ref?: Ref<[HTMLDivElement | null, HTMLDivElement | null]>
	children?: ReactNode
}) {
	const fixedRef = useRef<HTMLDivElement>(null)
	const stickyRef = useRef<HTMLDivElement>(null)

	useImperativeHandle<
		[HTMLDivElement | null, HTMLDivElement | null],
		[HTMLDivElement | null, HTMLDivElement | null]
	>(ref, () => [fixedRef.current, stickyRef.current])

	const { isIOS } = useBrowserData()
	const hideSticky = isIOS === false
	const height = useSafariOversizeHeight()

	return (
		<>
			{hideSticky ? null : (
				<Page>
					<StickyVariant
						ref={stickyRef}
						className={className}
						style={{ ...style, height }}
					>
						{children}
					</StickyVariant>
				</Page>
			)}
			<FixedVariant ref={fixedRef} className={className} style={style}>
				{children}
			</FixedVariant>
		</>
	)
}

const Page = styled("div", [
	f.unresponsive(css`
		/* cover the entire page with an absolute div */
		position: absolute;
		z-index: 99;
		top: 0;
		left: 0;

		/* prevent adding overflow from this div's content */
		overflow: clip;
		width: 100%;
		height: 100%;
		pointer-events: none;
	`),
])

const StickyVariant = styled("div", [
	f.responsive(css`
		/* stick to center of viewport */
		position: sticky;
		top: 50%;
		left: 0;
		width: 100%;
		height: 100%;

		/* never stop sticking */
		margin-bottom: -100vmax;
		transform: translateY(-50%);
	`),
])

const FixedVariant = styled("div", [
	f.responsive(css`
		position: fixed;
		z-index: 99;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	`),
])
