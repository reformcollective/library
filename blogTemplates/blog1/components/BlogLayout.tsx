import { ScrollTrigger } from "gsap/ScrollTrigger"
import { usePinType } from "library/Scroll"
import { fmobile, fresponsive, ftablet } from "library/fullyResponsive"
import useAnimation from "library/useAnimation"
import { useParamState } from "library/useParamState"
import { getResponsivePixels } from "library/viewportUtils"
import { type ReactNode, useRef } from "react"
import styled, { css } from "styled-components"
// Would rather use the colors and text styles from the specific project
import colors from "../styles/template-colors"
import textStyles from "../styles/template-text"

import Categories from "./Categories"
import EmailInput from "./EmailInput"
import SearchBar from "./SearchBar"

export default function BlogLayout({ children }: { children: ReactNode }) {
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
			<Header>
				Lorem ipsum dolor sit amet
				<Description>
					Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
					eiusmod tempor incididunt ut labore et dolore magna aliqua.
				</Description>
			</Header>
			<SearchBar />
			<Columns>
				<Left>
					<div ref={pin}>
						<Categories />
						<EmailInput />
					</div>
				</Left>
				<Right>{children}</Right>
			</Columns>
		</BlogWrapper>
	)
}

const BlogWrapper = styled.div`
  ${fresponsive(css`
    width: 1220px;
    margin-bottom: 108px;
  `)}

  ${ftablet(css`
    width: 884px;
  `)}

  ${fmobile(css`
    width: 318px;
  `)}
`

const Header = styled.div`
  ${textStyles.h5};
  border-bottom: 1px solid ${colors.black};
  ${fresponsive(css`
    display: flex;
    gap: 16px;
    align-items: center;
    margin-top: 172px;
    margin-bottom: 8px;
    padding-bottom: 20px;
  `)}
  ${ftablet(css`
    margin-bottom: 25px;
  `)}
  ${fmobile(css`
    flex-direction: column;
    gap: 25px;
    margin-top: 130px;
    margin-bottom: 25px;
    align-items: start;
  `)}
`

const Circle = styled.div`
  ${fresponsive(css`
    width: 30px;
    height: 30px;
    position: relative;
  `)}
  ${fmobile(css`
    display: none;
  `)}
`

const Description = styled.div`
  ${textStyles.bodyS};
  ${fresponsive(css`
    width: 350px;
    text-align: right;
    margin-left: auto;
    color: ${colors.black};
  `)}
  ${ftablet(css`
    width: 254px;
  `)}
  ${fmobile(css`
    text-align: left;
    width: 288px;
    margin-left: 0;
  `)}
`

const Columns = styled.div`
  ${fresponsive(css`
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    gap: 40px;
  `)}
  ${ftablet(css`
    margin-top: 42px;
    gap: 30px;
  `)}
  ${fmobile(css`
    margin-top: 30px;
  `)}
`

const Left = styled.div`
  border-right: 1px solid ${colors.black};
 
  ${fmobile(css`
    display: none;
  `)}
`

const Right = styled.div`
  ${fresponsive(css`
    width: 884px;
  `)}
  ${ftablet(css`
    width: 585px;
  `)}
  ${fmobile(css`
    width: 318px;
  `)}
`
