import { ScrollTrigger } from "gsap/ScrollTrigger"
import { usePinType } from "library/Scroll"
import { fmobile, fresponsive, ftablet } from "library/fullyResponsive"
import useAnimation from "library/useAnimation"
import { useParamState } from "library/useParamState"
import { getResponsivePixels } from "library/viewportUtils"
import { type ReactNode, useRef } from "react"
import styled, { css } from "styled-components"
import { desktopBreakpoint } from "styles/media"
import { MobileOnly } from "library/breakpointUtils"

// The three components below are part of the customizable header
// import AvatarWidget from "sections/home/01-Hero/AvatarWidget"
// import CallWidget from "sections/home/01-Hero/CallWidget"
// import Kicker from "components/Kicker"

import Categories from "./Categories"
import EmailInput from "./EmailInput"
import SearchBar from "./SearchBar"
import HubHeader from "./HubHeader"

import {
	projectTextStyles as textStyles,
	transparentText,
} from "../blogConfig/templateText"
import { blogConfig as data } from "../blogConfig/data"

const gradients = data.projectGradients
const colors = data.projectColors

export default function BlogLayout({
	children,
	categoriesData,
	headerKicker,
}: {
	children: ReactNode
	categoriesData: string[]
	headerKicker?: ReactNode
}) {
	const pin = useRef<HTMLDivElement>(null)
	const pinType = usePinType()

	const [query] = useParamState("query")
	const [category] = useParamState("category")
	const [showAll] = useParamState("showAll")

	useAnimation(
		() => {
			ScrollTrigger.create({
				trigger: pin.current,
				start: () => `top top+=${getResponsivePixels(120)}`,
				end: () =>
					// the height of the parent less the height of the pin
					`+=${
						(pin.current?.parentElement?.offsetHeight ?? 0) -
						(pin.current?.offsetHeight ?? 0)
					}`,
				pin: true,
				pinType,
			})
		},
		[pinType],
		{
			extraDeps: [query, category, showAll],
		},
	)

	return (
		<BlogWrapper>
			<BlogInner>
				{/* <Header>
					<StyledCall />
					<StyledAvatar />
					<Kicker icon="phone" iconLeft iconColor={colors.green400}>
						Blog
					</Kicker>
					<h1>
						TODO: Replace with Header text.
						Lorem ipsum dolor sit amet
					</h1>
					<Description>
						TODO: Replace with a description of the blog content.
						Lorem ipsum dolor sit amet, consectetur adipiscing elit.
					</Description>
				</Header> */}
				<HubHeader kicker={headerKicker} />
				<Columns>
					<Left>
						<div ref={pin}>
							<SearchBar />
							<Categories categoriesData={categoriesData} />
							<EmailInput />
						</div>
					</Left>
					<Right>
						<MobileOnly>
							<Line />
							<SearchBar />
						</MobileOnly>
						{children}
					</Right>
				</Columns>
			</BlogInner>
		</BlogWrapper>
	)
}

const BlogWrapper = styled.div`
  width: 100%;
  display: grid;
  place-items: center;
  background-color: ${colors.neutralWhite};
`

const BlogInner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: ${desktopBreakpoint}px;

  ${fresponsive(css`
    padding: 134px 110px 150px;
    gap: 50px;
  `)}

  ${ftablet(css`
    padding: 158px 20px 150px;
  `)}

  ${fmobile(css`
    padding: 112px 8px 100px;
    gap: 32px;
  `)}
`

const Header = styled.div`
  ${textStyles.h5};
  background-color: ${colors.neutral100};
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  position: relative;
  overflow: clip;

  strong {
    ${transparentText}
    background-image: ${gradients.primarySecondary};
  }

  ${fresponsive(css`
    border-radius: 24px;
    gap: 10px;
    padding: 32px 48px 46px;
  `)}

  ${ftablet(css`
    gap: 15px;
  `)}

  ${fmobile(css`
    ${textStyles.h6}
    gap: 18px;
    align-items: start;
  `)}
`

const Description = styled.div`
  ${textStyles.bodyS};
  color: ${colors.neutral700};

  ${fresponsive(css`
    width: 350px;
    text-align: left;
  `)}

  ${fmobile(css`
    text-align: left;
    width: 288px;
    margin-left: 0;
  `)}

  ${fmobile(css`
    width: 100%;
  `)}
`

const Line = styled.div`
  display: none;
  background-color: ${colors.neutral300};

  ${fmobile(css`
    display: flex;
    width: 100%;
    height: 1px;
    margin-bottom: 32px;
  `)}
`

const Columns = styled.div`
  ${fresponsive(css`
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    padding: 0 50px;
    width: 100%;
  `)}

  ${ftablet(css`
    gap: 58px;
  `)}

  ${fmobile(css`
    padding: 0 23px;
  `)}
`

const Left = styled.div` 
  ${fresponsive(css`
    width: 269px;
  `)}

  ${fmobile(css`
    display: none;
  `)}
`

const Right = styled.div`
  ${fresponsive(css`
    width: 768px;
  `)}
  ${ftablet(css`
    width: 560px;
  `)}
  ${fmobile(css`
    width: 100%;
  `)}
`
// The two components below are part of the customizable header:

// const StyledCall = styled(CallWidget)`
//   position: absolute;

//   ${fresponsive(css`
//     left: unset;
//     bottom: unset;
//     top: -19px;
//     right: 165px;
//   `)}

//   ${ftablet(css`
//     right: 12px;
//     top: -50px;
//   `)}

//   ${fmobile(css`
//     display: none;
//   `)}
// `

// const StyledAvatar = styled(AvatarWidget)`
//   position: absolute;

//   ${fresponsive(css`
//     bottom: 14px;
//     right: 22px;
//   `)}

//   ${ftablet(css`
//     right: -14px;
//     bottom: -49px;
//   `)}

//   ${fmobile(css`
//     display: none;
//   `)}
// `
