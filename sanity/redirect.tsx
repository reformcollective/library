import UniversalLink from "library/link"
import { css, f, styled } from "library/styled"
import { draftMode } from "next/headers"
import { redirect } from "next/navigation"
import type { GetSectionType } from "page"

import { library } from "library/layers.css"

export async function Redirect({ link }: GetSectionType<"redirect">) {
	const isDraft = await (await draftMode()).isEnabled

	if (isDraft) {
		return (
			<Wrapper>
				<p>
					This page is configured as a redirect. If someone tries to navigate to
					this page in any way, they will be redirected to{" "}
					{link ? <Link href={link}>{link}</Link> : "an unset destination"}
				</p>
				<br />
				<p>You are seeing this message because you are in draft mode.</p>
			</Wrapper>
		)
	}

	if (!link) return null
	redirect(link as Parameters<typeof redirect>[0])
}

const Wrapper = styled("div", [
	{
		"@layer": {
			[library]: f.unresponsive(css`
				height: 100vh;
				padding: 100px;
				background: white;
				color: black;
				grid-column: main;
				overflow-wrap: break-word;
				text-align: center;
			`),
		},
	},
])

const Link = styled(UniversalLink, [
	{
		"@layer": {
			[library]: f.unresponsive(css`
				text-decoration: underline;
			`),
		},
	},
])
