import UniversalLink from "library/link"
import { styled } from "library/styled"
import {
	type ListNestMode,
	type MissingComponentHandler,
	PortableText,
	type PortableTextComponents,
} from "next-sanity"
import type { ReactNode } from "react"

import { library } from "library/layers.css"

type PossibleMarks =
	| "strong"
	| "em"
	| "code"
	| "underline"
	| "strike-through"
	| "super"
	| "sub"

type Input = {
	_type: string
	_key?: string
	style?: string
	list?: string
	listItem?: string
	markDefs?: Array<{
		_type: string
	}> | null
}

type UnionToIntersection<U> = (
	U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
	? I
	: never

type ValueComponent<V = never> = ({
	children,
	value,
}: {
	children: ReactNode
	value: V
}) => ReactNode

type GetMarkDefinition<Item extends Input> = Item extends unknown
	? Item["_type"] extends "block"
		? {
				block?: NonNullable<Item["style"]> extends string
					? {
							[style in NonNullable<Item["style"]>]?: ValueComponent<Item>
						}
					: undefined
				list?: NonNullable<Item["listItem"]> extends string
					? {
							[listItem in NonNullable<Item["listItem"]>]: ValueComponent<Item>
						}
					: undefined
				listItem?: NonNullable<Item["listItem"]> extends string
					? {
							[listItem in NonNullable<Item["listItem"]>]: ValueComponent<Item>
						}
					: undefined
				marks?: {
					[mark in PossibleMarks]?: ValueComponent
				} & {
					[customMark in NonNullable<
						Item["markDefs"]
					>[number] as customMark["_type"]]?: ValueComponent<customMark>
				}
			}
		: {
				types: {
					[itemType in Exclude<Item["_type"], "block">]: ValueComponent<
						Item & { _type: itemType }
					>
				}
			}
	: never

type GetComponents<T extends Input> = UnionToIntersection<GetMarkDefinition<T>>

export const TypedPortableText = <MarkType extends Input[]>({
	value,
	components,
	listNestingMode,
	onMissingComponent,
}: {
	/**
	 * One or more blocks to render
	 */
	value: MarkType | null | undefined
	/**
	 * React components to use for rendering
	 */
	components?: NoInfer<GetComponents<MarkType[number]>>
	/**
	 * Function to call when encountering unknown unknown types, eg blocks, marks,
	 * block style, list styles without an associated React component.
	 *
	 * Will print a warning message to the console by default.
	 * Pass `false` to disable.
	 */
	onMissingComponent?: MissingComponentHandler | false
	/**
	 * Determines whether or not lists are nested inside of list items (`html`)
	 * or as a direct child of another list (`direct` - for React Native)
	 *
	 * You rarely (if ever) need/want to customize this
	 */
	listNestingMode?: ListNestMode
}) => {
	if (!value) return null

	const cast = (components ?? {}) as Partial<PortableTextComponents>

	return (
		<PortableText
			value={value}
			components={
				{
					...cast,
					block: {
						...defaultBlocks,
						...cast.block,
					},
					list: {
						...defaultList,
						...cast.list,
					},
					marks: {
						...defaultMarks,
						...cast.marks,
					},
				} as unknown as PortableTextComponents
			}
			listNestingMode={listNestingMode}
			onMissingComponent={onMissingComponent}
		/>
	)
}

/**
 * i've added several default styles, but feel free to add more or configure them
 */

const DefaultNormal = styled("div", {
	"@layer": {
		[library]: {
			minHeight: "1em",
			marginTop: "0.5em",
			marginBottom: "0.5em",
		},
	},
})
const hStyle = {
	fontWeight: "bold",
	minHeight: "1em",
	marginTop: "1em",
	marginBottom: "0.5em",
}
const DefaultH1 = styled("h1", {
	"@layer": { [library]: { ...hStyle, fontSize: "2em" } },
})
const DefaultH2 = styled("h2", {
	"@layer": { [library]: { ...hStyle, fontSize: "1.5em" } },
})
const DefaultH3 = styled("h3", {
	"@layer": { [library]: { ...hStyle, fontSize: "1.25em" } },
})
const DefaultH4 = styled("h4", {
	"@layer": { [library]: { ...hStyle, fontSize: "1em" } },
})
const DefaultH5 = styled("h5", {
	"@layer": { [library]: { ...hStyle, fontSize: "0.875em" } },
})
const DefaultH6 = styled("h6", {
	"@layer": { [library]: { ...hStyle, fontSize: "0.75em" } },
})
const DefaultBlockQuote = styled("blockquote", {
	"@layer": {
		[library]: {
			borderLeft: "1px solid currentcolor",
			marginLeft: 0,
			padding: "1em 2em",
			opacity: 0.8,
		},
	},
})

const defaultBlocks = {
	normal: ({ children }: { children: ReactNode }) => (
		<DefaultNormal>{children}</DefaultNormal>
	),
	h1: ({ children }: { children: ReactNode }) => (
		<DefaultH1>{children}</DefaultH1>
	),
	h2: ({ children }: { children: ReactNode }) => (
		<DefaultH2>{children}</DefaultH2>
	),
	h3: ({ children }: { children: ReactNode }) => (
		<DefaultH3>{children}</DefaultH3>
	),
	h4: ({ children }: { children: ReactNode }) => (
		<DefaultH4>{children}</DefaultH4>
	),
	h5: ({ children }: { children: ReactNode }) => (
		<DefaultH5>{children}</DefaultH5>
	),
	h6: ({ children }: { children: ReactNode }) => (
		<DefaultH6>{children}</DefaultH6>
	),
	blockquote: ({ children }: { children: ReactNode }) => (
		<DefaultBlockQuote>{children}</DefaultBlockQuote>
	),
}

const DefaultBullet = styled("ul", {
	"@layer": {
		[library]: {
			listStyle: "disc",
			paddingLeft: "1.5em",
		},
	},
})
const DefaultNumber = styled("ol", {
	"@layer": {
		[library]: {
			listStyle: "decimal",
			paddingLeft: "1.5em",
		},
	},
})

const defaultList = {
	bullet: ({ children }: { children: ReactNode }) => (
		<DefaultBullet>{children}</DefaultBullet>
	),
	number: ({ children }: { children: ReactNode }) => (
		<DefaultNumber>{children}</DefaultNumber>
	),
}

const DefaultStrong = styled("strong", {
	"@layer": {
		[library]: {
			fontWeight: "bold",
		},
	},
})
const DefaultEm = styled("em", {
	"@layer": {
		[library]: {
			fontStyle: "italic",
		},
	},
})
const DefaultCode = styled("code", {
	"@layer": {
		[library]: {
			fontFamily: "monospace",
			background: "#333",
			color: "#fff",
			padding: "0.2em 0.3em",
			borderRadius: "0.2em",
		},
	},
})
const DefaultUnderline = styled("u", {
	"@layer": {
		[library]: {
			textDecoration: "underline",
		},
	},
})
const DefaultStrikeThrough = styled("s", {
	"@layer": {
		[library]: {
			textDecoration: "line-through",
		},
	},
})
const DefaultSuper = styled("sup", {
	"@layer": {
		[library]: {
			fontSize: "0.8em",
			verticalAlign: "super",
		},
	},
})
const DefaultSub = styled("sub", {
	"@layer": {
		[library]: {
			fontSize: "0.8em",
			verticalAlign: "sub",
		},
	},
})
const DefaultLink = styled(UniversalLink, {
	"@layer": {
		[library]: {
			textDecoration: "underline",
		},
	},
})

const defaultMarks = {
	strong: ({ children }: { children: ReactNode }) => (
		<DefaultStrong>{children}</DefaultStrong>
	),
	em: ({ children }: { children: ReactNode }) => (
		<DefaultEm>{children}</DefaultEm>
	),
	code: ({ children }: { children: ReactNode }) => (
		<DefaultCode>{children}</DefaultCode>
	),
	underline: ({ children }: { children: ReactNode }) => (
		<DefaultUnderline>{children}</DefaultUnderline>
	),
	"strike-through": ({ children }: { children: ReactNode }) => (
		<DefaultStrikeThrough>{children}</DefaultStrikeThrough>
	),
	super: ({ children }: { children: ReactNode }) => (
		<DefaultSuper>{children}</DefaultSuper>
	),
	sub: ({ children }: { children: ReactNode }) => (
		<DefaultSub>{children}</DefaultSub>
	),
	link: ({
		value,
		children,
	}: {
		value: {
			href?: string
			_type: "link"
			_key: string
		}
		children: ReactNode
	}) =>
		value.href ? (
			<DefaultLink href={value.href}>{children}</DefaultLink>
		) : (
			<>{children} (empty link)</>
		),
}
