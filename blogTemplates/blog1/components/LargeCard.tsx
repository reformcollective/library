import Secondary from "../components/Buttons/Secondary"
import { loadPage } from "library/Loader/TransitionUtils"
import UniversalImage from "library/UniversalImage"
import { fmobile, fresponsive, ftablet } from "library/fullyResponsive"
import styled, { css } from "styled-components"
import colors from "../styles/template-colors"
import textStyles, { trim } from "../styles/template-text"
import type { BlogCard } from "../types/template-aliases"

export default function LargeCard({ data }: { data: BlogCard }) {
	const {
		author,
		mainImage,
		title,
		articleTextPreview,
		slug,
		createdAt,
		overridePublishedDate,
	} = data
	const date = overridePublishedDate ?? createdAt

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
			<PublishDate>{date}</PublishDate>
			<Title>{title}</Title>
			<Details>
				<Description>{articleTextPreview}</Description>
				<ProfilePhoto
					image={author?.photo?.gatsbyImageData}
					alt={author?.fullName ?? ""}
				/>
				{author && (
					<Author>
						<div>{author.fullName}</div>
						<div>{author.roleAndCompany}</div>
					</Author>
				)}
			</Details>
			<CustomWidthButton to={`/blog/${slug}`} variant="green">
				Continue Reading
			</CustomWidthButton>
		</Wrapper>
	)
}

const Wrapper = styled.div`
  ${fresponsive(css`
    display: grid;
    gap: 26px;
    margin-bottom: 60px;
    cursor: pointer;
  `)}
  ${ftablet(css`
    margin-bottom: 66px;
  `)}
  ${fmobile(css`
    margin-bottom: 50px;
    margin-top: 20px;
  `)}
`

const Image = styled(UniversalImage)`
  ${fresponsive(css`
    width: 100%;
    aspect-ratio: 886 / 440;
    border-radius: 16px;
  `)}
  ${ftablet(css`
    aspect-ratio: 585 / 440;
  `)}
  ${fmobile(css`
    aspect-ratio: 318 / 270;
  `)}
`

const Title = styled.div`
  ${trim(1.2)}
  ${textStyles.h6};
  color: ${colors.green};
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
    gap: 28px 10px;
    margin-bottom: 10px;
  `)}
`

const Description = styled.div`
  ${trim(1.25)}
  ${textStyles.bodyS};
  color: ${colors.black};
  grid-column: span 2;
  ${ftablet(css`
    ${textStyles.bodyR};
    ${trim(1.2)};
    margin-top: 10px;
  `)}
  ${fmobile(css`
    ${textStyles.bodyR};
    ${trim(1.2)};
    margin-top: 10px;
  `)}
`

const ProfilePhoto = styled(UniversalImage)`
  ${fresponsive(css`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    isolation: isolate;
    overflow: clip;
  `)}
  ${ftablet(css`
    width: 48px;
    height: 48px;
  `)}
  ${fmobile(css`
    width: 48px;
    height: 48px;
  `)}
`

const Author = styled.div`
  ${textStyles.bodyXS};
  color: ${colors.black};
  display: flex;
  flex-direction: column;
  justify-content: center;
  ${ftablet(css`
    ${textStyles.bodyS};
    gap: 3px;
  `)}
  ${fmobile(css`
    ${textStyles.bodyS};
    gap: 3px;
  `)}
`

const CustomWidthButton = styled(Secondary)`
  ${ftablet(css`
    width: 249px;
  `)}
  ${fmobile(css`
    width: 100%;
  `)}
`

const PublishDate = styled.div`
  color: ${colors.black};
  ${fresponsive(css`
  ${textStyles.bodyXS};
  `)}

  ${ftablet(css`
  ${textStyles.bodyS};
  `)}
`
