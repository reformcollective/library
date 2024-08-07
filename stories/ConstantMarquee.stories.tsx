import styled from "styled-components"
import ConstantMarquee from "../ConstantMarquee"

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
	title: "Components/ConstantMarquee",
	component: ConstantMarquee,
}

const Content = styled.div`
	margin-right: 20px;
`

export const constantMarquee = {
	args: {
		children: <Content>Constant Marquee</Content>,
	},
}
