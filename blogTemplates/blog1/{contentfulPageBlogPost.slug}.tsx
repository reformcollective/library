import { useNavConfig } from "components/Providers/Nav"
import Seo from "components/Seo"
import PostContent from "components/blog/PostContent"
import Share from "components/blog/Share"
import SmallCard from "components/blog/SmallCard"
import type { PageProps } from "gatsby"
import { graphql } from "gatsby"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ReactComponent as ArrowIconSVG } from "images/blog/blogArrow.svg"
import UniversalLink from "library/Loader/UniversalLink"
import { usePinType } from "library/Scroll"
import { DesktopTabletOnly } from "library/breakpointUtils"
import { fmobile, fresponsive, ftablet } from "library/fullyResponsive"
import useAnimation from "library/useAnimation"
import { getResponsivePixels } from "library/viewportUtils"
import { useRef } from "react"
import styled, { css } from "styled-components"
import colors from "styles/colors"
import textStyles from "styles/text"

export default function BlogPostPage({
	data: {
		contentfulPageBlogPost: post,
		allContentfulPageBlogPost: { nodes: recentArticles },
	},
}: PageProps<Queries.BlogPostQuery>) {
	useNavConfig({ menuDark: true })

	const pin = useRef<HTMLDivElement>(null)
	const pinType = usePinType()

	useAnimation(() => {
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
	}, [pinType])

	const relatedArticles = post?.relatedArticles?.filter(Boolean)

	return (
		<Wrapper>
			<Heading>
				<UniversalLink to="/blog">Blog</UniversalLink>
				<Arrow />
				<Light>Article</Light>
				<UniversalLink to="/blog/">Back to Home</UniversalLink>
			</Heading>
			<Content>
				<div />
				{post ? <PostContent post={post} /> : "Post not found."}
				<DesktopTabletOnly>
					<Socials ref={pin}>
						<Share title={post?.title} />
					</Socials>
				</DesktopTabletOnly>
			</Content>
			<Related>
				<RelatedHeading>
					{relatedArticles ? "Related Articles" : "Recent Articles"}
				</RelatedHeading>
				{(relatedArticles ?? recentArticles).map((article) => (
					<SmallCard key={article.slug} data={article} />
				))}
			</Related>
		</Wrapper>
	)
}

export function Head({ data }: PageProps<Queries.BlogPostQuery>) {
	return (
		<Seo
			title={data.contentfulPageBlogPost?.title}
			description={data.contentfulPageBlogPost?.articleTextPreview}
			image={data.contentfulPageBlogPost?.mainImage?.file?.url ?? ""}
			pathname={`blog/${data.contentfulPageBlogPost?.slug ?? ""}`}
		/>
	)
}

const Wrapper = styled.div`
  ${fresponsive(css`
    width: 1220px;
    padding: 172px 0 99px;
  `)}
  ${ftablet(css`
    width: 883px;
    padding: 204px 0 67px;
  `)}
  ${fmobile(css`
    width: 318px;
    padding: 130px 0 68px;
  `)}
`

const Heading = styled.div`
  border-bottom: 1px solid ${colors.black};
  ${fresponsive(css`
    display: flex;
    align-items: center;
    color: ${colors.green};
    gap: 14px;
    padding-bottom: 16px;
  `)}
`

const Arrow = styled(ArrowIconSVG)`
  ${fresponsive(css`
    width: 11px;
    height: 11px;
  `)}
`

const Light = styled.div`
  color: ${colors.black};
  margin-right: auto;
`

const Content = styled.div`
  ${fresponsive(css`
    display: grid;
    grid-template-columns: 1fr 670px 1fr;
    margin-bottom: 181px;
  `)}
  ${ftablet(css`
    margin-top: 20px;
    margin-bottom: 127px;
  `)}
  ${fmobile(css`
    grid-template-columns: 0 318px 0;
    margin-bottom: 64px;
  `)}
`

const Socials = styled.div`
  ${fresponsive(css`
    display: grid;
    place-items: start end;
    gap: 15px;
    padding-top: 30px;
  `)}
  ${ftablet(css`
    padding-right: 22px;
  `)}
`

const Related = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  ${fresponsive(css`
    width: 902px;
    margin: 0 auto;
    gap: 48px 31px;
  `)}
  ${ftablet(css`
    width: 884px;
    gap: 80px 22px;
  `)}
  ${fmobile(css`
    grid-template-columns: 1fr;
    width: 318px;
    gap: 36px;
  `)}
`

const RelatedHeading = styled.div`
  grid-column: span 3;
  text-align: center;
  ${textStyles.h4};
  ${fmobile(css`
    grid-column: span 1;
    ${textStyles.h6};
    text-align: left;
    margin-bottom: -6px;
  `)}
`

export const query = graphql`
  query BlogPost($id: String) {
    contentfulPageBlogPost(id: { eq: $id }) {
      title
      slug
      articleTextPreview
      createdAt(formatString: "MMMM Do, YYYY")
      overridePublishedDate(formatString: "MMMM Do, YYYY")
      author {
        id
        photo {
          gatsbyImageData
          createdAt
        }
        fullName
        roleAndCompany
      }
      mainImage {
        file {
          url
        }
        gatsbyImageData
        description
      }
      categories
      articleText {
        raw
        references {
          ... on ContentfulAsset {
            contentful_id
            title
            description
            gatsbyImageData(width: 1000)
            __typename
          }
        }
      }
      relatedArticles {
        title
        slug
        mainImage {
          gatsbyImageData
          description
        }
        articleTextPreview
        overridePublishedDate(formatString: "MMMM Do, YYYY")
        createdAt(formatString: "MMMM Do, YYYY")
        author {
          id
          photo {
            gatsbyImageData
            createdAt
          }
          fullName
          roleAndCompany
        }
      }
    }
    # get the three most recent blog posts that are not the current post
    allContentfulPageBlogPost(
      filter: { id: { nin: [$id, "e1d582e5-f8d2-52c5-a1eb-a758ee4a4f72"] } }
      sort: { createdAt: DESC }
      limit: 3
    ) {
      nodes {
        slug
        id
        createdAt(formatString: "MMMM Do, YYYY")
        author {
          id
          photo {
            gatsbyImageData
            createdAt
          }
          fullName
          roleAndCompany
        }
        title
        mainImage {
          gatsbyImageData
          description
        }
        categories
        articleTextPreview
        overridePublishedDate(formatString: "MMMM Do, YYYY")
      }
    }
  }
`
