import type { Options } from "@contentful/rich-text-react-renderer"
import { BLOCKS, INLINES, MARKS } from "@contentful/rich-text-types"
import { ContactLink } from "library/blogTemplates/blog1/components/Contact/ContactLink"
import type { IGatsbyImageData } from "gatsby-plugin-image"
import blogListArrow from "images/blog/blogListArrow.svg"
import renderContent from "library/RichText/renderContent"
import UniversalImage from "library/UniversalImage"
import { fresponsive } from "library/fullyResponsive"
import styled, { css } from "styled-components"
import colors from "../styles/template-colors"
import textStyles from "../styles/template-text"

const Strong = styled.strong`
  font-weight: 500;
`

const U = styled.u`
  text-decoration: underline;
`

const Em = styled.em`
  font-style: italic;
`

const Code = styled.pre`
  margin: 0;
  ${textStyles.bodyR}
  font-family: monospace;
`

const Sub = styled.sub`
  vertical-align: sub;
`

const Sup = styled.sup`
  vertical-align: super;
`

const H1 = styled.h1`
  ${textStyles.h6}
`

const H2 = styled.h2`
  ${textStyles.titleL}
`

const P = styled.p`
  ${textStyles.bodyR}
`

const Ul = styled.ul`
  list-style-image: url(${blogListArrow});
  padding-inline-start: 2.3ch;
  ${fresponsive(css`
    display: grid;
    gap: 24px;
  `)}
`

const Ol = styled.ol`
  list-style-type: numeric;
  padding-inline-start: 2.3ch;
  ${fresponsive(css`
    display: grid;
    gap: 24px;
  `)}
`

const Li = styled.li``

const Hr = styled.hr`
  border-bottom: 1px solid ${colors.black};
`

const A = styled(ContactLink)`
  color: ${colors.green};
  text-decoration: underline;
`

const Quote = styled.div`
  ${textStyles.bodyXL}
  ${fresponsive(css`
    color: ${colors.green};
    display: flex;
	flex-direction: column;
    padding: 40px;
    align-items: flex-start;
    gap: 30px;
    border-radius: 20px;
    background: ${colors.green};
  `)}
`

const Image = styled(UniversalImage)`
  ${fresponsive(css`
    border-radius: 16px;
  `)}
`

/**
 * Typescript over-narrows typeof object
 */
const isObject = (
	obj: unknown,
): obj is Record<string | number | symbol, unknown> => {
	return typeof obj === "object" && obj !== null && !Array.isArray(obj)
}

const isGatsbyImageData = (obj: unknown): obj is IGatsbyImageData => {
	return isObject(obj) && "images" in obj
}

const HOSTS = new Set(["www.example.com"])

/**
 * checks if the URL is internal, and if so returns the pathname (and hash/queries)
 * otherwise returns the full URL
 */
const getURL = (url: string) => {
	try {
		const { host, pathname, search } = new URL(url)
		return HOSTS.has(host)
			? { internal: true, href: `${pathname}${search}` }
			: { internal: false, href: url }
	} catch {
		return { internal: false, href: url }
	}
}

const options: Options = {
	renderMark: {
		[MARKS.BOLD]: (children) => <Strong>{children}</Strong>,
		[MARKS.UNDERLINE]: (children) => <U>{children}</U>,
		[MARKS.ITALIC]: (children) => <Em>{children}</Em>,
		[MARKS.CODE]: (children) => <Code>{children}</Code>,
		[MARKS.SUBSCRIPT]: (children) => <Sub>{children}</Sub>,
		[MARKS.SUPERSCRIPT]: (children) => <Sup>{children}</Sup>,
	},
	renderNode: {
		[BLOCKS.HEADING_1]: (node, children) => <H1>{children}</H1>,
		[BLOCKS.HEADING_2]: (node, children) => <H2>{children}</H2>,
		[BLOCKS.PARAGRAPH]: (node, children) => <P>{children}</P>,
		[BLOCKS.UL_LIST]: (node, children) => <Ul>{children}</Ul>,
		[BLOCKS.OL_LIST]: (node, children) => <Ol>{children}</Ol>,
		[BLOCKS.LIST_ITEM]: (node, children) => <Li>{children}</Li>,
		[BLOCKS.HR]: () => <Hr />,
		[INLINES.HYPERLINK]: (node, children) => {
			const { data } = node
			const { uri } = data
			// check if internal link
			if (typeof uri === "string") {
				return <A to={uri}>{children}</A>
			}
		},
		[BLOCKS.QUOTE]: (node, children) => <Quote>{children}</Quote>,
		// images
		[BLOCKS.EMBEDDED_ASSET]: (node) => {
			const { data } = node
			const target = data.target as unknown

			/**
			 * check if we have all the properties for a gatsby image
			 */
			if (
				isObject(target) &&
				"gatsbyImageData" in target &&
				isGatsbyImageData(target.gatsbyImageData) &&
				"description" in target &&
				typeof target.description === "string"
			)
				return (
					<Image
						image={target.gatsbyImageData}
						alt={target.description}
						imgStyle={{ width: "auto", margin: "0 auto" }}
					/>
				)

			return <span>Invalid Image</span>
		},
	},
}

interface RichTextProps {
	content?: {
		raw?: string | null
		references?: unknown
	} | null
}

export default function RichText({ content }: RichTextProps) {
	return <Wrapper>{renderContent(content, options)}</Wrapper>
}

const Wrapper = styled.div`
  ${fresponsive(css`
    display: grid;
    gap: 30px;
  `)}
`
