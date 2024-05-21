import UniversalLink from "library/Loader/UniversalLink"
import UniversalImage from "library/UniversalImage"
import { fmobile, fresponsive, ftablet } from "library/fullyResponsive"
import styled, { css } from "styled-components"
import colors from "../styles/template-colors"
import textStyles, { trim } from "../styles/template-text"
import type { BlogPost } from "../types/template-aliases"

import { DesktopTabletOnly, MobileOnly } from "library/breakpointUtils"
import RichText from "./RichComponents"
import Share from "./Share"

export default function PostContent({ post }: { post: NonNullable<BlogPost> }) {
	const {
		author,
		title,
		mainImage,
		categories,
		articleText,
		createdAt,
		overridePublishedDate,
	} = post
	const date = overridePublishedDate ?? createdAt
	return (
		<Wrapper>
			<PublishDateMobile>{date}</PublishDateMobile>
			<Title>{title}</Title>
			{author && (
				<Row>
					<Author>
						<ProfilePhoto
							image={author.photo?.gatsbyImageData}
							alt={`Profile photo of ${author.fullName}`}
						/>
						<div>{author.fullName}</div>
						<div>{author.roleAndCompany}</div>
					</Author>
					<PublishDate>{date}</PublishDate>
				</Row>
			)}
			<ArticleImage
				image={mainImage?.gatsbyImageData}
				alt={mainImage?.description ?? "broken image"}
			/>
			<Categories>
				{/* Category may not be of type string */}
				{categories?.filter(Boolean).map((category: string) => (
					<Category to={`/blog?category=${category}`} key={category}>
						{category}
					</Category>
				))}
			</Categories>
			<RichText content={articleText} />

			<MobileSocials>
				<Share title={title} />
			</MobileSocials>
		</Wrapper>
	)
}

const Wrapper = styled.div`
  border-bottom: 1px solid ${colors.black};
  ${fresponsive(css`
    margin-top: 30px;
    padding-bottom: 32px;
  `)}
  ${fmobile(css`
    margin-top: 45px;
  `)}
`

const Title = styled.h1`
  ${textStyles.h6}
  ${fresponsive(css`
    margin-bottom: 20px;
  `)}
  ${fmobile(css`
    margin-bottom: 30px;
  `)}
`

const Author = styled.div`
  ${textStyles.bodyXS};
  color: ${colors.black};
  display: grid;
  place-items: center start;
  grid-template-columns: auto 1fr;
  ${fresponsive(css`
    gap: 0 8px;
  `)}
  ${fmobile(css`
    ${textStyles.bodyS}
  `)}
`

const ProfilePhoto = styled(UniversalImage)`
  ${fresponsive(css`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    isolation: isolate;
    overflow: clip;
    grid-row: span 2;
  `)}
  ${fmobile(css`
    width: 48px;
    height: 48px;
  `)}
`

const ArticleImage = styled(UniversalImage)`
  ${fresponsive(css`
    width: 670px;
    height: 442px;
    margin-top: 12px;
    margin-bottom: 16px;
    border-radius: 16px;
  `)}
  ${fmobile(css`
    width: 318px;
    height: 208px;
    margin-top: 22px;
    margin-bottom: 22px;
  `)}
`

const Categories = styled.div`
  ${fresponsive(css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 32px;
  `)}
`

const Category = styled(UniversalLink)`
  ${trim(1.3)}
  ${fresponsive(css`
    display: flex;
    padding: 11px 13px;
    gap: 8px;
    border-radius: 24px;
    background: ${colors.green};
    color: ${colors.green};
    font-family: Denim, sans-serif;
    font-size: 12px;
    font-style: normal;
    font-weight: 500;
    line-height: 130%; /* 15.6px */
  `)}
`

const MobileSocials = styled.div`
  display: none;
  ${fmobile(css`
    display: flex;
    justify-content: center;
    gap: 15px;
    padding: 44px;
    margin-top: 30px;
  `)}
`

const Row = styled.div`
display: flex;
justify-content: space-between;
`

const PublishDate = styled(DesktopTabletOnly)`
 ${fresponsive(css`
    ${textStyles.bodyXS};
    color: ${colors.black};
  `)}

  ${ftablet(css`
  ${textStyles.bodyS};
  `)}
`

const PublishDateMobile = styled(MobileOnly)`
  color: ${colors.black};
  ${fmobile(css`
  ${textStyles.bodyS};
  margin-bottom: 22px;
  `)}
`
