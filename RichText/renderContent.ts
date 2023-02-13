import {
  documentToReactComponents,
  Options,
} from "@contentful/rich-text-react-renderer"
import { Document } from "@contentful/rich-text-types"
import { renderRichText } from "gatsby-source-contentful/rich-text"

function hasNodeType(x: object): x is { nodeType: unknown } {
  return "nodeType" in x
}

function hasContent(x: object): x is { content: unknown } {
  return "content" in x
}

function hasData(x: object): x is { data: unknown } {
  return "data" in x
}

/**
 * returns true if the given object is at least similar to a Contentful Rich Text Document
 */
function isDocument(x: object): x is Document {
  return (
    hasNodeType(x) &&
    x.nodeType === "document" &&
    hasContent(x) &&
    Array.isArray(x.content) &&
    hasData(x) &&
    typeof x.data === "object"
  )
}

function isObject(x: unknown): x is Record<string | number | symbol, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x)
}

type WithReferencesType = {
  contentful_id: string
  __typename: string // not type safe, but is this used anywhere?
}

/**
 * returns true if the given object is similar to a Contentful Rich Text Gatsby Reference
 */
function isContentfulRichTextGatsbyReference(
  x: unknown
): x is WithReferencesType {
  return isObject(x)
}

function isArrayOfContentfulRichTextGatsbyReference(
  x: unknown
): x is WithReferencesType[] {
  return Array.isArray(x) && x.every(isContentfulRichTextGatsbyReference)
}

export default function renderContent(
  content?: {
    raw?: string | null
    references?: unknown
  } | null,
  options?: Options
) {
  /**
   * use a different renderer if we have references
   * one must have references, the other one must not
   */

  const references = content?.references

  if (references && isArrayOfContentfulRichTextGatsbyReference(references)) {
    return renderRichText(
      {
        raw: content.raw ?? "",
        references,
      },
      options
    )
  }

  if (content && content.raw) {
    // parse the raw content and verify that it is valid JSON
    const parsedContent = JSON.parse(content.raw) as unknown

    if (isObject(parsedContent) && isDocument(parsedContent)) {
      return documentToReactComponents(parsedContent, options)
    }
  }

  return null
}
