import { useState, useEffect, ReactElement } from 'react'
import gsap from 'gsap'
import styled from 'styled-components'
import useMedia from './useMedia'

interface Props {
  children: ReactElement[]
}

export default function SideScroll({ children }: Props) {

  const [wrapperEl, setWrapperEl] = useState<HTMLDivElement | null>(null)
  const [innerEl, setInnerEl] = useState<HTMLDivElement | null>(null)
  const gap = useMedia(50, 50, 50, 50)

  useEffect(() => {
    if (wrapperEl && innerEl && children.length) {
      const width = innerEl.children[0]?.getBoundingClientRect().width

      if (width) {
        gsap.to(innerEl, {
          x: -((width * (children.length || 0)) + (gap * (children.length - 1 || 0)) - window.innerWidth),
          scrollTrigger: {
            trigger: wrapperEl,
            start: 'top top',
            end: 'bottom bottom',
            pin: innerEl,
            scrub: true
          }
        })
      }
    }
  }, [wrapperEl, innerEl, children, gap])

  return (
    <Wrapper ref={ref => setWrapperEl(ref)} length={children?.length}>
      <Inner ref={ref => setInnerEl(ref)}>
        {children}
      </Inner>
    </Wrapper>
  )
}

const Wrapper = styled.div<{length: number}>`
  position: relative;
  height: calc(100vh * ${props => props.length});
  width: 100vw;
`

const Inner = styled.div`
  position: relative;
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 50px;
`