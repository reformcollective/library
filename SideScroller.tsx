import styled from "styled-components";
import { useState, useEffect } from "react";
import gsap, { ScrollTrigger } from "gsap/all";
import useCanHover from "library/canHover"
import { usePinType } from "library/Scroll"
import useAnimation from "library/useAnimation"

gsap.registerPlugin(ScrollTrigger);

const DATA = [1, 2, 3, 4, 5, 6];

export default function App() {
  const [wrapperEl, setWrapperEl] = useState<HTMLElement | null>(null);
  const [innerEl, setInnerEl] = useState<HTMLDivElement | null>(null);
  const [innerWidth, setInnerWidth] = useState(0);
  const [wrapperHeight, setWrapperHeight] = useState(0);

  const pinType = usePinType()
  const touchscreenMode = !useCanHover()

  useEffect(() => {
    if (innerEl) {
      const newInnerWidth = innerEl.getBoundingClientRect().width;
      setInnerWidth(newInnerWidth);
    }
  }, [innerEl]);

  useEffect(() => {
    if (innerWidth) {
      const multiplyBy = innerWidth / window.innerWidth;
      const height = window.innerHeight * multiplyBy;

      setWrapperHeight(height);
    }
  }, [setWrapperHeight, innerWidth]);

  useAnimation(() => {
    if (touchscreenMode) return

    if (wrapperEl && innerEl && innerWidth && wrapperHeight) {
      const x = -(innerWidth > window.innerWidth
        ? innerWidth - window.innerWidth
        : 0);

      gsap.to(innerEl, {
        x,
        scrollTrigger: {
          trigger: wrapperEl,
          start: "top top",
          end: "bottom bottom",
          pin: innerEl,
          pinType,
          scrub: true,
          markers: true
        }
      });
    }
  }, [wrapperEl, innerEl, innerWidth, pinType, touchscreenMode, wrapperHeight]);

  const cards = DATA.map((item) => <Card key={item} />);

  return (
    <Wrapper ref={(ref) => setWrapperEl(ref)} height={wrapperHeight}>
      <Inner ref={(ref) => setInnerEl(ref)}>{cards}</Inner>
    </Wrapper>
  );
}

const Wrapper = styled.section<{height: number}>`
  position: relative;
  background-color: #020207;
  overflow: hidden;
  width: 100%;
  height: ${(props) => props.height}px;

  @media (hover: none) {
    height: fit-content;
    overflow-x: auto;
  }
`;

const Inner = styled.div`
  position: absolute;
  display: flex;
  align-items: center;
  width: fit-content;
  gap: 40px;
  height: 100vh;
  top: 0;
  left: 0;
  padding: 0px 200px;

  @media (hover: none) {
    width: fit-content;
    height: fit-content;
  }
`;

const Card = styled.div`
  background-color: blue;
  width: 400px;
  height: 400px;
`;
