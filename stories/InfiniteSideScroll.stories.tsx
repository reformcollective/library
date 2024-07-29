import styled from "styled-components"
import { InfiniteSideScroll } from "../InfiniteSideScroll"
import type { ComponentProps } from "react"

export default {
	title: "Components/InfiniteSideScroll",
	component: InfiniteSideScroll,
}

const Card = styled.div<{ $color: string }>`
	width: 300px;
	height: 300px;
	background: ${({ $color }) => $color};
`

const StyledButton = styled.button`
	width: 50px;
	height: 50px;
	font-size: 20px;
	cursor: pointer;
`

export const Playground = {
	args: {
		children: [
			<Card $color="purple" key="purple" />,
			<Card $color="indigo" key="indigo" />,
			<Card $color="blue" key="blue" />,
			<Card $color="green" key="green" />,
			<Card $color="lightGreen" key="lightGreen" />,
			<Card $color="yellow" key="yellow" />,
			<Card $color="gold" key="gold" />,
			<Card $color="orange" key="orange" />,
			<Card $color="orangered" key="orangered" />,
			<Card $color="red" key="red" />,
		],
		ArrowButton: (props) => <StyledButton {...props}>{">"}</StyledButton>,
	} satisfies ComponentProps<typeof InfiniteSideScroll>,
}
