import { ReactComponent as Icon } from "../images/icons/x.svg"
import { fmobile, fresponsive } from "library/fullyResponsive"
import UniversalLink from "library/Loader/UniversalLink"
import { useParamState } from "library/useParamState"
import styled, { css } from "styled-components"

import { projectTextStyles as textStyles } from "../blogConfig/templateText"
import { blogConfig as data } from "../blogConfig/data"

const colors = data.projectColors

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
					<ClearIcon />
					Clear Filters / Search
				</Wrapper>
			) : null}
		</>
	)
}

const Wrapper = styled(UniversalLink)`
  ${textStyles.sh4}
  color: ${colors.neutral800};

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
    stroke: ${colors.neutralBlack};
  }

  ${fresponsive(css`
    width: 16px;
    height: 16px;
  `)}
`
