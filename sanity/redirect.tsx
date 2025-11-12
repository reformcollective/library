import { css, f, styled } from "library/styled/alpha"
import { library } from "library/layers.css"
import { draftMode } from "next/headers"
import { redirect } from "next/navigation"
import type { GetSectionType } from "page"

export async function Redirect({ link }: GetSectionType<"redirect">) {
	const isDraft = await (await draftMode()).isEnabled

	if (isDraft) {
		return (
			<Wrapper>
				<p>
					This page is configured as a redirect. If someone tries to navigate to
					this page in any way, they will be redirected to{" "}
					<a href={link}>{link}</a>
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
	{ "@layer": { [library]: f.unresponsive(css`
		grid-column: main;
		height: 100vh;
		padding: 100px;
		background: white;
		color: black;
		text-align: center;
		overflow-wrap: break-word;

		a {
			text-decoration: underline;
		}
	`) } },
])
