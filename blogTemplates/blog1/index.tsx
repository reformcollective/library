import Primary from "components/Buttons/Primary"
import { useNavConfig } from "components/Providers/Nav"
import Seo from "components/Seo"
import BlogLayout from "components/blog/BlogLayout"
import Categories from "components/blog/Categories"
import EmailInput from "components/blog/EmailInput"
import LargeCard from "components/blog/LargeCard"
import SmallCard from "components/blog/SmallCard"
import type { PageProps } from "gatsby"
import { graphql } from "gatsby"
import { ScrollSmoother } from "gsap/ScrollSmoother"
import { MobileOnly } from "library/breakpointUtils"
import { fmobile, fresponsive, ftablet } from "library/fullyResponsive"
import { useParamState } from "library/useParamState"
import { useEffect } from "react"
import styled, { css } from "styled-components"
import colors from "./styles/template-colors"
import textStyles from "./styles/template-text"
import { useSearchResults } from "./utils/useSearchResults"

export default function BlogPage({ data }: PageProps<Queries.BlogPageQuery>) {
	useNavConfig({ menuDark: true })

	const unfilteredCards = data.allContentfulPageBlogPost.nodes
	const featuredCard = data.contentfulBlogHubPage?.featuredCaseStudy

	const restOfCards = unfilteredCards.filter(
		(card) => card.id !== featuredCard?.id,
	)
	const smallCards = restOfCards.slice(0, 9)
	const hasMoreCards = restOfCards.length > 9

	const [query] = useParamState("query")
	const [category] = useParamState("category")
	const [showAll, setShowAll] = useParamState("showAll")

	/**
	 * instant scroll to top on any query change
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: allowable side effect
	useEffect(() => {
		ScrollSmoother.get()?.scrollTo(0)
	}, [query, category, showAll])

	const searchedCards = useSearchResults(
		query ?? "",
		[...unfilteredCards],
		["articleTextPreview", "author", "slug", "title"],
	)
	const categorizedCards = category
		? searchedCards.filter((card) => card.categories?.includes(category))
		: searchedCards

	if (Boolean(query) || Boolean(category))
		return (
			<BlogLayout>
				{query && category ? (
					<LightHeader>
						Search results for <span>“{query}”</span> in <span>{category}</span>
					</LightHeader>
				) : category ? (
					<Header>Categories / {category}</Header>
				) : (
					<LightHeader>
						Search results for <span>“{query}”</span>
					</LightHeader>
				)}
				<CardGroup>
					{categorizedCards.map((card) => (
						<SmallCard key={card.id} data={card} />
					))}
					{categorizedCards.length === 0 && <div>No results found</div>}
				</CardGroup>
			</BlogLayout>
		)

	if (showAll) {
		return (
			<BlogLayout>
				<Header>All Articles</Header>
				<CardGroup>
					{unfilteredCards.map((card) => (
						<SmallCard key={card.id} data={card} />
					))}
				</CardGroup>
			</BlogLayout>
		)
	}

	return (
		<BlogLayout>
			{featuredCard && <LargeCard data={featuredCard} />}
			<MobileOnly>
				<Categories />
			</MobileOnly>
			<Header>Previous Articles</Header>
			<CardGroup>
				{smallCards.map((card) => (
					<SmallCard key={card.id} data={card} />
				))}
			</CardGroup>
			{hasMoreCards && (
				<CustomWidthButton
					type="button"
					onClick={() => {
						setShowAll("true")
					}}
				>
					See More
				</CustomWidthButton>
			)}
			<MobileEmail>
				<EmailInput />
			</MobileEmail>
		</BlogLayout>
	)
}

export function Head() {
	return (
		<Seo
			title="Lorem ipsum | Blog"
			description="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
			eiusmod tempor incididunt ut labore et dolore magna aliqua."
			pathname="/blog"
		/>
	)
}

const Header = styled.div`
  ${textStyles.h6}
  ${trim(1.2)}
  ${fresponsive(css`
    margin-bottom: 22px;
  `)}
  ${fmobile(css`
    margin-bottom: 30px;
    ${textStyles.titleL};
  `)}
`

const LightHeader = styled(Header)`
  color: ${colors.black};

  span {
    color: ${colors.black};
  }
`

const CardGroup = styled.div`
  ${fresponsive(css`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 48px 23px;
    margin-bottom: 55px;
  `)}
  ${ftablet(css`
    grid-template-columns: 1fr 1fr;
    gap: 35px 25px;
  `)}
  ${fmobile(css`
    grid-template-columns: 1fr;
    gap: 36px;
  `)}
`

const CustomWidthButton = styled(Primary)`
  ${fresponsive(css`
    width: 280px;
  `)}
  ${ftablet(css`
    width: 100%;
  `)}
  ${fmobile(css`
    width: 100%;
  `)}
`

const MobileEmail = styled(MobileOnly)`
  border-top: 1px solid ${colors.black};
  ${fmobile(css`
    padding-top: 50px;
    margin-top: 50px;
  `)}
`

export const query = graphql`
  query BlogPage {
    allContentfulPageBlogPost(filter: {id: {ne: "e1d582e5-f8d2-52c5-a1eb-a758ee4a4f72"}} sort: { createdAt: DESC }) {
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
	contentfulBlogHubPage(id: {eq: "915c0af9-dce8-5739-b87b-61d25efdc438"}) {
		id
		featuredCaseStudy {
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
