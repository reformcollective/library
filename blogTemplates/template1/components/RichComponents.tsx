import type { Options } from "@contentful/rich-text-react-renderer"
import { BLOCKS, INLINES, MARKS } from "@contentful/rich-text-types"
import type { IGatsbyImageData } from "gatsby-plugin-image"
import ChevronSVG from "../images/icons/Chev.svg"
import UniversalLink from "library/Loader/UniversalLink"
import renderContent from "library/RichText/renderContent"
import { fresponsive } from "library/fullyResponsive"
import styled, { css } from "styled-components"

import { projectTextStyles as textStyles } from "../blogConfig/templateText"
import UniversalImage from "library/UniversalImage"
import { blogConfig as data } from "../blogConfig/data"

const colors = data.projectColors

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
  ${textStyles.sh1}
`

const H2 = styled.h2`
  ${textStyles.sh2}
`

const P = styled.p`
  ${textStyles.bodyR}
	color: ${colors.neutral900};
`

const Ul = styled.ul`
  list-style-image: url(${ChevronSVG});
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

const Li = styled.li`
	${textStyles.sh3}
`

const Hr = styled.hr`
  border-bottom: 1px solid ${colors.neutral700};
`

const A = styled(UniversalLink)`
	color: ${colors.primary500};
  text-decoration: underline;
`

const ImageStyle = css`
${fresponsive(css`
    border-radius: 16px;
  `)}
`

const Image = styled(UniversalImage)`
  ${ImageStyle}
`

// const TempImg = styled.img`
// ${ImageStyle}
// width: auto;
// margin: 0 auto;
// `

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

const HOSTS = new Set(["thoughtly-internal.netlify.app", "thought.ly"])

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
					// <TempImg
					// 	src={target.gatsbyImageData as unknown as string}
					// 	alt={target.description}
					// />
				)

			return <span>Invalid Image</span>
		},
		[BLOCKS.EMBEDDED_ENTRY]: (node) => {
			return (
				<Quote>
					<Text>{node.data.target.quote}</Text>
					<Quotee>{node.data.target.quotee}</Quotee>
				</Quote>
			)
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
    gap: 32px;
  `)}
`

const Quote = styled.div`
	width: 100%;
	display: flex;
	flex-direction: column;
	background-color: ${colors.neutral200};
	
	${fresponsive(css`
		border-radius: 24px;
		padding: 40px;
		gap: 24px;
	`)}
`

const Text = styled.p`
	${textStyles.bodyXL}
`

const Quotee = styled.span`
	${textStyles.t2}
	color: ${colors.neutral800};
`
