import { ScrollTrigger } from "gsap/ScrollTrigger"
import type { ReactNode } from "react"
import { useState } from "react"
import styled from "styled-components"

import { usePinType } from "./Scroll"
import useAnimation from "./useAnimation"

/**
 * position: fixed doesn't normally work with ScrollSmoother because the page is transformed.
 *
 * this creates a fixed element 100vw x 100vh that is positioned at the top of the page.
 *
 * This element also has a transform, so any descendant elements with position: fixed
 * will be positioned correctly as if the page wasn't transformed.
 */
export default function PositionFixed({ children }: { children: ReactNode }) {
	const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null)
	const pinType = usePinType()

	useAnimation(() => {
		if (wrapper) {
			const pageHeight = document.body.scrollHeight
			ScrollTrigger.create({
				trigger: wrapper,
				pin: true,
				pinType,
				start: 0,
				end: pageHeight,
				pinSpacing: false,
			})
		}
	}, [pinType, wrapper])

	return (
		<Wrapper>
			<Wrapper
				ref={setWrapper}
				style={{
					border: "1px solid red",
				}}
			>
				{children}
			</Wrapper>
		</Wrapper>
	)
}

const Wrapper = styled.div`
  position: fixed;
  width: 100vw;
  height: 100vh;
  pointer-events: none;

  .pin-spacer {
    pointer-events: none;
  }

  > *:not(.pin-spacer) {
    pointer-events: auto;
  }
`
