import { ReactComponent as SearchSVG } from "../images/icons/search.svg"
import { fmobile, fresponsive } from "library/fullyResponsive"
import { useParamState } from "library/useParamState"
import styled, { css } from "styled-components"

import { projectTextStyles as textStyles } from "../blogConfig/templateText"
import { blogConfig as data } from "../blogConfig/data"

const colors = data.projectColors

export default function SearchBar() {
	const [query, setQuery] = useParamState("query")

	return (
		<Wrapper>
			<Row>
				<Input
					name="search"
					value={query ?? ""}
					onChange={(e) => setQuery(e.target.value || null)}
					type="text"
					placeholder={data.searchInputPlaceholder}
				/>
				<SearchIcon />
			</Row>
		</Wrapper>
	)
}

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  background-color: ${colors.neutral100};

  ${fresponsive(css`
    margin-bottom: 32px;
    padding: 12px;
    border-radius: 12px;
  `)}

  ${fmobile(css`
    flex-direction: column;
    align-items: stretch;
    gap: 26px;
  `)}
`

const Row = styled.div`
  display: flex;
  align-items: center;
  flex-grow: 1;
`

const SearchIcon = styled(SearchSVG)`
  ${fresponsive(css`
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  `)}
`

const Input = styled.input`
  ${textStyles.bodyS}
  ${fresponsive(css`
    height: 20px;
    width: 100%;
  `)}

  &::placeholder {
    color: ${colors.neutral800};
  }

  &:focus {
    outline: none;
  }
`
