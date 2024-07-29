import styled from "styled-components"
import OldInfiniteSideScroll from "../OldInfiniteSideScroll"

export default {
	title: "Components/InfiniteSideScroll",
	component: OldInfiniteSideScroll,
}

const Card = styled.div<{ $color: string }>`
	width: 300px;
	height: 300px;
	background: ${({ $color }) => $color};
`

const Gradient = styled.div`
	width: 100px;
	height: 300px;
	background: linear-gradient(to right, white 20%, transparent 100%);
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
		Gradient,
		Button: <StyledButton>{">"}</StyledButton>,
	},
}
