// import Button from "components/Buttons/Primary"
import { loadPage } from "library/Loader/TransitionUtils"
import { fmobile, fresponsive, ftablet } from "library/fullyResponsive"
import styled, { css } from "styled-components"
import type { BlogCard } from "types/aliases"
import Author from "./Author"
import type { ReactNode } from "react"

import {
	projectTextStyles as textStyles,
	clampText,
	trim,
} from "../blogConfig/templateText"
import UniversalImage from "library/UniversalImage"
import { blogConfig as data } from "../blogConfig/data"

const colors = data.projectColors

export default function LargeCard({
	data,
	button,
}: { data: BlogCard; button?: ReactNode }) {
	const { author, mainImage, title, articleTextPreview, slug } = data

	return (
		<Wrapper
			role="presentation"
			onClick={() => {
				loadPage(`/blog/${slug}`).catch(console.error)
			}}
		>
			<Image
				image={mainImage?.gatsbyImageData}
				alt={mainImage?.description ?? ""}
			/>
			<Title>{title}</Title>
			<Details>
				<Description>{articleTextPreview}</Description>
				{author && <Author data={author} />}
			</Details>
			{/* <CustomWidthButton icon="chev" to={`/blog/${slug}`} variant="secondary">
				Continue Reading
			</CustomWidthButton> */}
			{button ? (
				// <Button to={`/blog/${slug}`}>Continue Reading</Button>
				button
			) : (
				<PlaceholderButton>Continue Reading</PlaceholderButton>
			)}
		</Wrapper>
	)
}

const Wrapper = styled.div`
  display: grid;
  cursor: pointer;
  width: 100%;
  
  ${fresponsive(css`
    gap: 26px;
    margin-bottom: 60px;
  `)}

  ${ftablet(css`
    margin-bottom: 48px;
    gap: 20px;
  `)}

  ${fmobile(css`
    margin-top: 20px;
    padding-bottom: 50px;
    margin-bottom: 10px;
    border-bottom: 1px solid ${colors.neutral300};
    gap: 16px;
  `)}
`

const Image = styled(UniversalImage)`
  ${fresponsive(css`
      width: 100%;
      aspect-ratio: 768 / 440;
      border-radius: 16px;
    `)}
    ${ftablet(css`
      aspect-ratio: 585 / 440;
    `)}
    ${fmobile(css`
      aspect-ratio: 313 / 222;
    `)}
`

const Title = styled.div`
  ${clampText(2)}
  ${textStyles.h6};

  ${fresponsive(css`
    padding-bottom: 4px;
  `)}

  ${fresponsive(css`
    ${textStyles.sh1}
  `)}
`

const Details = styled.div`
  ${fresponsive(css`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 16px 8px;
  `)}

  ${ftablet(css`
    gap: 28px 10px;
    margin-bottom: 10px;
  `)}

  ${fmobile(css`
    gap: 16px;
  `)}
`

const Description = styled.div`
  ${trim(1.25)}
  ${clampText(2)}
  ${textStyles.bodyS};
  color: ${colors.neutral700};
  grid-column: span 2;

  ${fresponsive(css`
    padding-bottom: 2px;
  `)}

  ${ftablet(css`
    ${textStyles.bodyR};
    ${trim(1.2)};
    margin-top: 10px;
  `)}
  ${fmobile(css`
    ${textStyles.bodyS};
    ${trim(1.2)};
  `)}
`

// const CustomWidthButton = styled(Button)`
//   ${ftablet(css`
//     width: 249px;
//   `)}
//   ${fmobile(css`
//     width: 100%;
//   `)}
// `

export const PlaceholderButton = styled.button`
${fresponsive(css`
  ${textStyles.sh3};
  border: 1px solid ${colors.neutralBlack};
  border-radius: 8px;
  width: fit-content;
  cursor: pointer;
  padding: 4px 6px;
`)}
`
