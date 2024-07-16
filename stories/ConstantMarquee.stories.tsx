import styled from "styled-components"
import ConstantMarquee from "../ConstantMarquee"

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
	title: "Components/ConstantMarquee",
	component: ConstantMarquee,
}

const Wrapper = styled.div`
  display: flex;
  align-items: center;
`

const Block = styled.div<{ $color: string }>`
  margin-right: 20px;
  height: 200px;
  width: 200px;
  background-color: ${({$color}) => $color};
`

export const constantMarquee = {
  args: {
    children: <Wrapper>
      <Block $color="purple"/>
      <Block $color="indigo"/>
      <Block $color="blue"/>
      <Block $color="green"/>
      <Block $color="lightGreen"/>
      <Block $color="yellow"/>
      <Block $color="gold"/>
      <Block $color="orange"/>
      <Block $color="orangered"/>
      <Block $color="red"/>
    </Wrapper>
  }
}
