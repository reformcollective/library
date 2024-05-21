import UniversalLink from "library/Loader/UniversalLink"
import UniversalImage from "library/UniversalImage"
import { fmobile, fresponsive } from "library/fullyResponsive"
import styled, { css } from "styled-components"
import colors from "../styles/template-colors"
import textStyles, { trim, clampText } from "../styles/template-text"
import type { BlogCard } from "../types/template-aliases"

export default function SmallCard({
	data,
}: {
	data: Pick<
		BlogCard,
		| "slug"
		| "author"
		| "mainImage"
		| "title"
		| "overridePublishedDate"
		| "createdAt"
	>
}) {
	const { slug, author, mainImage, title, createdAt, overridePublishedDate } =
		data
	const date = overridePublishedDate ?? createdAt

	return (
		<Wrapper to={`/blog/${slug}`}>
			<PublishDate>{date}</PublishDate>
			<Image
				image={mainImage?.gatsbyImageData}
				alt={mainImage?.description ?? ""}
			/>
			<Title>{title}</Title>
			<Author>
				<div>{author?.fullName}</div>
				<div>{author?.roleAndCompany}</div>
			</Author>
		</Wrapper>
	)
}

const Wrapper = styled(UniversalLink)`
  ${fresponsive(css`
    display: grid;
    gap: 16px;
  `)}
`

const Image = styled(UniversalImage)`
  ${fresponsive(css`
    width: 280px;
    height: 180px;
    border-radius: 16px;
  `)}
  ${fmobile(css`
    width: 318px;
    height: 205px;
  `)}
`

const Title = styled.div`
  ${trim(1.2)}
  ${clampText(2)}
  ${textStyles.titleR};
  color: ${colors.green};

  ${fresponsive(css`
   padding: 4px 0;
   margin: -4px 0;
  `)}
`

const Author = styled.div`
  div {

    ${textStyles.bodyXS};
  }

  ${fresponsive(css`
    color: ${colors.black};
    display: grid;
    gap: 8px;
  `)}
`

const PublishDate = styled.div`
${textStyles.bodyXS};
  color: ${colors.black};
  ${fresponsive(css`
  margin-bottom: -5px;
  `)}
 
`
