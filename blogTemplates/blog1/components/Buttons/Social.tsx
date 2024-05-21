import { ContactLink } from "library/blogTemplates/blog1/components/Contact/ContactLink"
import { ReactComponent as LinkedinSVG } from "images/global/icons/linkedin.svg"
import { ReactComponent as Xsvg } from "images/global/icons/x.svg"
import { fresponsive } from "library/fullyResponsive"
import styled, { css } from "styled-components"
// Would rather use the colors from the specific project
import colors from "../../styles/template-colors"
import { eases } from "styles/eases"
import media from "styles/media"
// Would rather use the textStyles from the specific project
import textStyles from "../../styles/template-text"
import type { TemplateColors } from "../../types/template-aliases"

const BUTTON_EASE = eases.campfire.in

const icons = {
	linkedin: <LinkedinSVG />,
	x: <Xsvg />,
}

export default function Social({
	icon,
	to,
	color = "green",
	ariaLabel,
	// Best place to pull company name?
	companyName = "Our company",
}: {
	icon: keyof typeof icons
	to: string
	color?: TemplateColors
	ariaLabel?: string
	companyName: string
}) {
	const svg = icons[icon]
	// const baseColor = colors[`${color}Saturated02`]
	const baseColor = colors[`${color}`]

	return (
		<Wrapper ariaLabel={ariaLabel ?? `${companyName} on ${icon}`} to={to}>
			<OuterLayer style={{ backgroundColor: `${baseColor}20` }} />
			<MiddleLayer style={{ backgroundColor: `${baseColor}70` }} />
			<InnerLayer style={{ backgroundColor: baseColor }}>
				<Icon>{svg}</Icon>
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

const OuterLayer = styled.div`
  ${layerProps};
  left: 0;
  z-index: 1;
`

const MiddleLayer = styled.div`
  /* background-color should change according to specific project */
  background-color: ${`${colors.red}70`};
  ${layerProps};
  z-index: 2;
  left: 0;
`
const Icon = styled.div`
  position: relative;
  ${fresponsive(css`
    width: 15px;
    height: 15px;
  `)};
  transform-origin: center;
  transition: transform 0.4s ${BUTTON_EASE};

  > * {
    display: block;
  }
`

const Wrapper = styled(ContactLink)`
  ${textStyles.titleL};
  /* color should change according to specific project */
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

      ${Icon} {
        transform: scale(0.8);
        transition: transform 0.4s ${BUTTON_EASE};
      }
    }
  }
`

const InnerLayer = styled.div`
  ${layerProps};
  /* background-color should change according to specific project */
  background-color: ${colors.red};
  position: relative;
  display: grid;
  place-items: center;
  ${fresponsive(css`
    padding: 4px;
    width: 40px;
    height: 40px;
  `)};
  z-index: 3;
`
