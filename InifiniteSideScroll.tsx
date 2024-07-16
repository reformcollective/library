import gsap from "gsap"
import { ScrollToPlugin } from "gsap/all"
import React, {
	useRef,
	useState,
	useCallback,
	useEffect,
	type ReactElement,
} from "react"
import styled from "styled-components"

gsap.registerPlugin(ScrollToPlugin)

export default function InfiniteSideScroll({
	children,
	trackGap,
	Gradient,
	Button,
	className = "",
}: {
	children: React.ReactNode[]
	trackGap: number
	Gradient: ({ className }: { className?: string }) => ReactElement
	Button: ReactElement
	className?: string
}) {
	const activeIndex = useRef(0)
	const [trackEl, setTrackEl] = useState<HTMLDivElement | null>(null)
	const [trackInnerEl, setTrackInnerEl] = useState<HTMLDivElement | null>(null)
	const [childWidth, setChildWidth] = useState(0)
	const [scrollOffset, setScrollOffset] = useState(0)

	const restart = useCallback(() => {
		gsap.set(trackEl, {
			scrollTo: {
				x: scrollOffset,
			},
		})
	}, [trackEl, scrollOffset])

	useEffect(() => {
		const offset =
			(trackInnerEl?.clientWidth ?? 0) / 2 - (trackEl?.clientWidth ?? 0) / 2
		setScrollOffset(offset)
		const width = (trackInnerEl?.childNodes[0] as HTMLElement)?.clientWidth
		setChildWidth(width)
		restart()
	}, [restart, trackEl, trackInnerEl])

	const animate = () => {
		gsap.to(trackEl, {
			scrollTo: {
				x: activeIndex.current * (childWidth + trackGap) + scrollOffset,
			},
			duration: 0.25,
		})
	}

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		if (!e.target) return
		const { scrollLeft } = e.target as HTMLDivElement

		const index = (scrollLeft - scrollOffset) / (childWidth + trackGap)
		const actualIndex = index < 0 ? Math.round(index) : Math.floor(index)

		activeIndex.current = actualIndex
		if (activeIndex.current >= children.length) {
			activeIndex.current = 0
			restart()
		} else if (activeIndex.current <= -children.length) {
			activeIndex.current = 0
			restart()
		}
	}

	const increaseIndex = () => {
		if (activeIndex.current >= children.length + 1) {
			activeIndex.current = 0
		} else {
			activeIndex.current += 1
		}

		animate()
	}

	const decreaseIndex = () => {
		if (activeIndex.current <= -children.length - 1) {
			activeIndex.current = 0
		} else {
			activeIndex.current -= 1
		}

		animate()
	}

	const ButtonDecrease = React.cloneElement(Button, {
		onClick: decreaseIndex,
		style: {
			transform: "scaleX(-1)",
		},
	})
	const ButtonIncrease = React.cloneElement(Button, { onClick: increaseIndex })

	return (
		<Wrapper className={className}>
			<Gradient className={GradientLeft} />
			<Track ref={(ref) => setTrackEl(ref)} onScroll={handleScroll}>
				<Inner ref={(ref) => setTrackInnerEl(ref)} $gap={trackGap}>
					{children}
					{children}
					{children}
				</Inner>
			</Track>
			<Gradient className={GradientRight} />
			{ButtonDecrease}
			{ButtonIncrease}
		</Wrapper>
	)
}

const Wrapper = styled.div`
  width: 100%;
  position: relative;
  transform: scale(1);
`

export const GradientLeft = styled.div`
  position: fixed;
  z-index: 2;
  left: 0;
  top: 0;
`

export const GradientRight = styled.div`
  position: fixed;
  z-index: 2;
  top: 0;
  right: 0;
  transform: scaleX(-1);
`

export const Track = styled.div`
  width: 100%;
  overflow-x: scroll;
  position: relative;
  transform: scale(1);
  scrollbar-width: none;

  ::-webkit-scrollbar {
    display: none;
  }
`

export const Inner = styled.div<{ $gap: number }>`
  width: fit-content;
  display: flex;
  align-items: center;
  gap: ${({ $gap }) => $gap}px;
`
