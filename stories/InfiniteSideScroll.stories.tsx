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
	min-width: 50px;
	height: 50px;
	font-size: 20px;
	cursor: pointer;
`

export const Playground = {
	args: {
		children: (
			<>
				<Card $color="purple" />,
				<Card $color="indigo" />,
				<Card $color="blue" />,
				<Card $color="green" />,
				<Card $color="lightGreen" />,
				<Card $color="yellow" />,
				<Card $color="gold" />,
				<Card $color="orange" />,
				<Card $color="orangered" />,
				<Card $color="red" />,
			</>
		),
		ArrowButton: (props) => <StyledButton {...props}>{"next >"}</StyledButton>,
		BackArrowButton: (props) => (
			<StyledButton {...props}>{"< previous"}</StyledButton>
		),
	} satisfies ComponentProps<typeof InfiniteSideScroll>,
}
