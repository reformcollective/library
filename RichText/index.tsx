import type { Options } from "@contentful/rich-text-react-renderer"
import { BLOCKS, INLINES, MARKS } from "@contentful/rich-text-types"
import type { Block } from "@contentful/rich-text-types"
import type { Inline } from "@contentful/rich-text-types"
import UniversalLink, {
	type UniversalLinkProps,
} from "library/Loader/UniversalLink"
import type { ComponentProps } from "react"
import type { ReactNode } from "react"
import styled from "styled-components"
import { defaultExtensions } from "./defaultExtensions"
import renderContent from "./renderContent"

const Strong = styled.strong`
	font-weight: bold;
`

const U = styled.u`
	text-decoration: underline;
`

const Em = styled.em`
	font-style: italic;
`

const Code = styled.code`
	font-family: monospace;
`

const H1 = styled.h1`
	font-size: 1.5rem;
	font-weight: bold;
`
const H2 = styled.h2`
	font-size: 1.25rem;
	font-weight: bold;
`
const H3 = styled.h3``
const H4 = styled.h4``
const H5 = styled.h5``
const H6 = styled.h6``
const P = styled.p``
const Ul = styled.ul`
	list-style-type: disc;
	padding-inline-start: 2.3ch;
`

const Ol = styled.ol`
	list-style-type: numeric;
	padding-inline-start: 2.3ch;
`
const Li = styled.li``
const A = styled(UniversalLink)`
	text-decoration: underline;
`
const Quote = styled.blockquote``
const Sup = styled.sup`
	vertical-align: super;
`
const Sub = styled.sub`
	vertical-align: sub;
`
const Strike = styled.s`
	text-decoration: line-through;
`

const Hr = styled.hr`
	width: 100%;
	height: 2px;
	background: black;
	border-bottom: 1px solid white;
	opacity: 0.1;
`

const defaults = {
	h1: H1,
	h2: H2,
	h3: H3,
	h4: H4,
	h5: H5,
	h6: H6,
	p: P,
	ul: Ul,
	ol: Ol,
	li: Li,
	a: A,
	blockquote: Quote,
	em: Em,
	strong: Strong,
	u: U,
	code: Code,
	sup: Sup,
	sub: Sub,
	s: Strike,
	hr: Hr,
}

/**
 * renders rich text from contentful
 * provide your own components to override the default styling if desired
 *
 * you can provide extensions to render embedded assets or entries. the first matching extension will be used.
 * see the defaultExtensions array for some examples
 */
export default function RichText({
	content,
	components,
	extensions = [],
}: {
	content?: {
		raw?: string | null
		references?: unknown
	} | null
	components?: {
		[K in keyof typeof defaults]?: K extends "a"
			? (props: UniversalLinkProps) => JSX.Element
			: (props: ComponentProps<K>) => JSX.Element
	}
	extensions?: ((data: unknown) => ReactNode)[]
}) {
	const c = { ...defaults, ...components }

	const fullExtensions = [...extensions, ...defaultExtensions]

	const renderExtensions = (node: Block | Inline) => {
		const { data } = node
		const target = data.target as unknown

		for (const extension of fullExtensions) {
			const result = extension(target)
			if (result) return result
		}
	}

	const options: Options = {
		renderMark: {
			[MARKS.BOLD]: (children) => <c.strong>{children}</c.strong>,
			[MARKS.UNDERLINE]: (children) => <c.u>{children}</c.u>,
			[MARKS.ITALIC]: (children) => <c.em>{children}</c.em>,
			[MARKS.CODE]: (children) => <c.code>{children}</c.code>,
			[MARKS.SUPERSCRIPT]: (children) => <c.sup>{children}</c.sup>,
			[MARKS.SUBSCRIPT]: (children) => <c.sub>{children}</c.sub>,
			[MARKS.STRIKETHROUGH]: (children) => <c.s>{children}</c.s>,
		},
		renderNode: {
			[BLOCKS.HEADING_1]: (_, children) => <c.h1>{children}</c.h1>,
			[BLOCKS.HEADING_2]: (_, children) => <c.h2>{children}</c.h2>,
			[BLOCKS.HEADING_3]: (_, children) => <c.h3>{children}</c.h3>,
			[BLOCKS.HEADING_4]: (_, children) => <c.h4>{children}</c.h4>,
			[BLOCKS.HEADING_5]: (_, children) => <c.h5>{children}</c.h5>,
			[BLOCKS.HEADING_6]: (_, children) => <c.h6>{children}</c.h6>,
			[BLOCKS.PARAGRAPH]: (_, children) => <c.p>{children}</c.p>,
			[BLOCKS.UL_LIST]: (_, children) => <c.ul>{children}</c.ul>,
			[BLOCKS.OL_LIST]: (_, children) => <c.ol>{children}</c.ol>,
			[BLOCKS.LIST_ITEM]: (_, children) => <c.li>{children}</c.li>,
			[BLOCKS.HR]: () => <c.hr />,
			[INLINES.HYPERLINK]: (node, children) => {
				const { data } = node
				const { uri } = data
				const Link = c.a
				if (typeof uri === "string") {
					return <Link to={uri}>{children}</Link>
				}
			},
			[BLOCKS.QUOTE]: (_, children) => <c.blockquote>{children}</c.blockquote>,
			[INLINES.EMBEDDED_ENTRY]: renderExtensions,
			[BLOCKS.EMBEDDED_ASSET]: renderExtensions,
			[BLOCKS.EMBEDDED_ENTRY]: renderExtensions,
		},
	}

	return <>{renderContent(content, options)}</>
}
