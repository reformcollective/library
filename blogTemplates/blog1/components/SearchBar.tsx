// import { ReactComponent as ClearIconSVG } from "images/blog/clearFilterIcon.svg"
// import { ReactComponent as SearchIconSVG } from "images/blog/search.svg"
import UniversalLink from "library/Loader/UniversalLink"
import { fmobile, fresponsive } from "library/fullyResponsive"
import { useParamState } from "library/useParamState"
import styled, { css } from "styled-components"
import colors from "../styles/template-colors"
import textStyles from "../styles/template-text"

export default function SearchBar() {
	const [category, setCategory] = useParamState("category")
	const [query, setQuery] = useParamState("query")
	const [showAll, setShowAll] = useParamState("showAll")

	return (
		<Wrapper>
			<Row>
				<SearchIcon />
				<Input
					name="search"
					value={query ?? ""}
					onChange={(e) => setQuery(e.target.value || null)}
					type="text"
					placeholder="Search the blog..."
				/>
			</Row>

			{Boolean(category) || Boolean(query) || Boolean(showAll) ? (
				<ClearButton
					type="button"
					onClick={() => {
						setCategory(null)
						setQuery(null)
						setShowAll(null)
					}}
				>
					<ClearIcon />
					Clear Filters / Categories
				</ClearButton>
			) : null}
		</Wrapper>
	)
}

const Wrapper = styled.div`
  display: flex;
  align-items: center;
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

const SearchIcon = styled(SearchIconSVG)`
  ${fresponsive(css`
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  `)}
`

const Input = styled.input`
  ${fresponsive(css`
    padding: 0 16px;
    height: 40px;
    width: 100%;
  `)}

  &::placeholder {
    color: ${colors.black};
  }

  &:focus {
    outline: none;
  }
`

const ClearButton = styled(UniversalLink)`
  ${textStyles.bodyS}
  ${fresponsive(css`
    display: flex;
    gap: 12px;
    align-items: center;
    color: ${colors.black};
    white-space: nowrap;
    flex-shrink: 0;
  `)}
  ${fmobile(css`
    padding-top: 20px;
    border-top: 1px solid ${colors.black};
  `)}
`

const ClearIcon = styled(ClearIconSVG)`
  ${fresponsive(css`
    width: 16px;
    height: 16px;
  `)}
`
