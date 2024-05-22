import Icon from "components/Icon"
import UniversalLink from "library/Loader/UniversalLink"
import { fmobile, fresponsive } from "library/fullyResponsive"
import { useParamState } from "library/useParamState"
import styled, { css } from "styled-components"
import colors from "styles/colors"
import textStyles from "styles/text"

export default function ClearButton() {
	const [category, setCategory] = useParamState("category")
	const [query, setQuery] = useParamState("query")
	const [showAll, setShowAll] = useParamState("showAll")
	return (
		<>
			{Boolean(category) || Boolean(query) || Boolean(showAll) ? (
				<Wrapper
					type="button"
					onClick={() => {
						setCategory(null)
						setQuery(null)
						setShowAll(null)
					}}
				>
					<ClearIcon name="x" />
					Clear Filters / Search
				</Wrapper>
			) : null}
		</>
	)
}

const Wrapper = styled(UniversalLink)`
  ${textStyles.sh4}
  color: ${colors.gray800};

  ${fresponsive(css`
    display: flex;
    gap: 10px;
    align-items: center;
    white-space: nowrap;
    flex-shrink: 0;
  `)}

  ${fmobile(css`
    padding-top: 20px;
  `)}
`

const ClearIcon = styled(Icon)`
  path {
    stroke: ${colors.black};
  }

  ${fresponsive(css`
    width: 16px;
    height: 16px;
  `)}
`

// TODO:
// remove icon
// remove colors
// remove textStyles

// Colors used:
// Author: gray800
// BlogLayout: green400, white, gray100, gray700, gray300
// Categories: gray300, black, gray800
// ClearButton: black and gray800
// EmailInput: gray100, white, gray600
// LargeCard: gray300 and gray700
// PostContent: gray300, gray200, gray700
// RichComponents: gray900, gray700, gray500, gray200, gray800
// SearchBar: gray100, gray800
// Share and SmallCard: none
// index: gray700, gray900, gray300
// contentfulPageBlogPost: white, gray800, green400, gray300, gray600, gray700

// Plan:
// 1. Hub
//   a. Large card
//   b. Small card
//   c. Categories
//   d. Search bar
//   e. email input
//   f. header
// 2. Articles
//   a. postContent
//   b. share
// 3. add placeholder button

// {
//   fakeQueryData: {
//     a blog post
//   },
//   blogcolors: {
//     primary:
//   }
//   textStyles: {
//     1: "",
//     2: ""
//   }
// }

// project
// - copied blog hub tamplate page
// - copied article template page
// - copied data object / config file

// library
// - components (shouldnt change)
// - blog hub tamplate page
// - article template page
// - data object / config file
