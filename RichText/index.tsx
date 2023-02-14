import { Options } from "@contentful/rich-text-react-renderer"
import { BLOCKS, MARKS, INLINES } from "@contentful/rich-text-types"
// import { PageProps } from "gatsby"
import { IGatsbyImageData } from "gatsby-plugin-image"

import RichLink from "./modules/Link"
import {
  Strong,
  Code,
  H1,
  H2,
  H3,
  P,
  A,
  UL,
  OL,
  LI,
  Quote,
  U,
  EM,
  Image,
  H4,
  H5,
  H6,
} from "./modules/StyledComponents"
import renderContent from "./renderContent"

// type Props = {
//   content:
//     | NonNullable<
//         PageProps<Queries.BlogArticleQuery>["data"]["contentfulBlogArticle"]
//       >["content"]
//     | NonNullable<
//         PageProps<Queries.CaseStudyQuery>["data"]["contentfulCaseStudy"]
//       >["content"]
// }

// TODO: YOU BETTER NOT BE USING THIS FOR ANY PROJECTS
interface Props {
  // eslint-disable-next-line
  content: any
}

/**
 * Typescript over-narrows typeof object
 */
export const isObject = (
  obj: unknown
): obj is Record<string | number | symbol, unknown> => {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj)
}

export const isGatsbyImageData = (obj: unknown): obj is IGatsbyImageData => {
  return isObject(obj) && "images" in obj
}

const PROJECT_DOMAIN = "https://boostinsurance.com"

const options: Options = {
  renderMark: {
    [MARKS.BOLD]: children => <Strong>{children}</Strong>,
    [MARKS.UNDERLINE]: children => <U>{children}</U>,
    [MARKS.ITALIC]: children => <EM>{children}</EM>,
    [MARKS.CODE]: children => <Code>{children}</Code>,
  },
  renderNode: {
    [BLOCKS.HEADING_1]: (node, children) => <H1>{children}</H1>,
    [BLOCKS.HEADING_2]: (node, children) => <H2>{children}</H2>,
    [BLOCKS.HEADING_3]: (node, children) => <H3>{children}</H3>,
    [BLOCKS.HEADING_4]: (node, children) => <H4>{children}</H4>,
    [BLOCKS.HEADING_5]: (node, children) => <H5>{children}</H5>,
    [BLOCKS.HEADING_6]: (node, children) => <H6>{children}</H6>,
    [BLOCKS.PARAGRAPH]: (node, children) => <P>{children}</P>,
    [BLOCKS.UL_LIST]: (node, children) => <UL>{children}</UL>,
    [BLOCKS.OL_LIST]: (node, children) => <OL>{children}</OL>,
    [BLOCKS.LIST_ITEM]: (node, children) => <LI>{children}</LI>,
    [INLINES.HYPERLINK]: (node, children) => {
      const { data } = node
      const { uri } = data
      // check if internal link
      if (typeof uri === "string") {
        const link = uri.includes(PROJECT_DOMAIN)
          ? uri.replace(PROJECT_DOMAIN, "")
          : uri
        return <A to={link}>{children}</A>
      }
    },
    [BLOCKS.QUOTE]: (node, children) => <Quote>{children}</Quote>,
    [INLINES.EMBEDDED_ENTRY]: node => {
      const { data } = node
      const target = data.target as unknown

      /**
       * check if we have all the properties for a link
       */
      if (
        isObject(target) &&
        "displayText" in target &&
        typeof target.displayText === "string" &&
        "url" in target &&
        typeof target.url === "string" &&
        "newTab" in target &&
        typeof target.newTab === "boolean"
      ) {
        const link = target.url.includes(PROJECT_DOMAIN)
          ? target.url.replace(PROJECT_DOMAIN, "")
          : target.url

        return (
          <RichLink
            data={{
              displayText: target.displayText,
              url: link,
              newTab: target.newTab,
            }}
          />
        )
      }

      return <span>Invalid Link</span>
    },
    // images
    [BLOCKS.EMBEDDED_ASSET]: node => {
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

export default function RichText({ content }: Props) {
  // TODO: GET RID OF THIS CHECK AND UPDATE TYPE
  // eslint-disable-next-line
  return <>{renderContent(content, options)}</>
}
