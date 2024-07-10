import InfiniteSideScroll from "../InifiniteSideScroll";
import styled from 'styled-components'
import React from 'react'

export default {
  title: 'Components/InfiniteSideScroll',
  component: InfiniteSideScroll
}

const Card = styled.div<{ $color: string }>`
  width: 300px;
  height: 300px;
  background: ${({ $color }) => $color};
`

const Gradient = styled.div`
  width: 100px;
  height: 300px;
  background: linear-gradient(
    to right,
    white 20%,
    transparent 100%
  );
`

const StyledButton = styled.button`
  width: 50px;
  height: 50px;
  font-size: 20px;
  cursor: pointer;
`

export const Playground = {
  args: {
    trackGap: 50,
    children: [
      <Card $color="purple"/>,
      <Card $color="indigo"/>,
      <Card $color="blue"/>,
      <Card $color="green"/>,
      <Card $color="lightGreen"/>,
      <Card $color="yellow"/>,
      <Card $color="gold"/>,
      <Card $color="orange"/>,
      <Card $color="orangered"/>,
      <Card $color="red"/>,
    ],
    Gradient,
    Button: <StyledButton>{">"}</StyledButton>
  }
}

