import { ContactLink } from "library/blogTemplates/blog1/components/Contact/ContactLink"
import type { UniversalLinkProps } from "library/Loader/UniversalLink"
import { fmobile, fresponsive, ftablet } from "library/fullyResponsive"
import styled, { css } from "styled-components"
// Would rather use the colors from the specific project
import colors from "../../styles/template-colors"
import { eases } from "styles/eases"
import media from "styles/media"
// Would rather use the textStyles from the specific project
import textStyles from "../../styles/template-text"

export type SecondaryVariant = "red" | "green" | "blue"

// Replace with a project specific ease?
const BUTTON_EASE = eases.campfire.in

const getColors = (variant: SecondaryVariant) => {
	switch (variant) {
		case "red":
			return {
				innerColor: colors.red,
				middleColor: `${colors.red}70`,
				outerColor: `${colors.red}20`,
				textColor: colors.white,
			}

		case "green":
			return {
				innerColor: colors.green,
				middleColor: `${colors.green}70`,
				outerColor: `${colors.green}20`,
				textColor: colors.black,
			}

		case "blue":
			return {
				innerColor: colors.blue,
				middleColor: `${colors.blue}70`,
				outerColor: `${colors.blue}20`,
				textColor: colors.white,
			}

		default:
			variant satisfies never
	}
}

export default function Secondary({
	children,
	variant,
	className = "",
	...props
}: UniversalLinkProps & {
	variant: SecondaryVariant
}) {
	const buttonColors = getColors(variant)

	return (
		<Wrapper className={className} {...props}>
			<OuterLayer $backgroundColor={buttonColors?.outerColor} />
			<MiddleLayer $backgroundColor={buttonColors?.middleColor} />
			<InnerLayer $backgroundColor={buttonColors?.innerColor}>
				<ButtonText $textColor={buttonColors?.textColor}>{children}</ButtonText>
			</InnerLayer>
		</Wrapper>
	)
}

const layerProps = css`
  position: absolute;
  transition: all 0.4s ${BUTTON_EASE};
  ${fresponsive(css`
    width: 100%;
    height: 100%;
    border-radius: 99vw;
  `)};
`

const OuterLayer = styled.div<{ $backgroundColor?: string }>`
  background-color: ${({ $backgroundColor }) => $backgroundColor};
  ${layerProps};
  left: 0;
  z-index: 1;
  ${fmobile(css`
    display: none;
  `)};
`

const MiddleLayer = styled.div<{ $backgroundColor?: string }>`
  background-color: ${({ $backgroundColor }) => $backgroundColor};
  ${layerProps};
  z-index: 2;
  left: 0;
  ${fmobile(css`
    display: none;
  `)};
`

const Wrapper = styled(ContactLink)`
  ${textStyles.titleL};
  color: ${colors.black};
  width: fit-content;
  height: fit-content;
  display: flex;
  align-items: center;
  position: relative;

  ${media.hover} {
    &:hover {
      ${OuterLayer} {
        height: calc(100% + 24px);
        width: calc(100% + 24px);
        left: -12px;
        transition: all 0.4s ${BUTTON_EASE};
      }

      ${MiddleLayer} {
        height: calc(100% + 12px);
        width: calc(100% + 12px);
        left: -6px;
        transition: all 0.4s ${BUTTON_EASE};
        transition-delay: 0.05s;
      }
    }
  }
`

const InnerLayer = styled.div<{ $backgroundColor?: string }>`
  ${layerProps};
  background-color: ${({ $backgroundColor }) => $backgroundColor};
  position: relative;
  display: grid;
  place-items: center;
  ${fresponsive(css`
    padding: 16px 24px;
  `)};
  z-index: 3;

  ${ftablet(css`
    padding: 16px 24px;
  `)};

  ${fmobile(css`
    padding: 15px 30px;
  `)};
`

const ButtonText = styled.span<{ $textColor?: string }>`
  ${textStyles.titleS};
  line-height: 1;
  color: ${({ $textColor }) => $textColor};
  position: relative;
  z-index: 3;

  ${fmobile(css`
    ${textStyles.titleR};
    line-height: 1;
    white-space: nowrap;
  `)};
`
