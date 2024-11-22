import type { ComponentProps } from "react"
import { InfiniteSideScroll } from "../InfiniteSideScroll"
import { styled } from "../styled"

export default {
	title: "Components/InfiniteSideScroll",
	component: InfiniteSideScroll,
}

const Card = styled("div", {
	width: "300px",
	height: "300px",
	background: "red",
})

const StyledButton = styled("button", {
	minWidth: "50px",
	height: "50px",
	fontSize: "20px",
	cursor: "pointer",
})

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
