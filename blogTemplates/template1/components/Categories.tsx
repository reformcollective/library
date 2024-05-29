import { fmobile, fresponsive, ftablet } from "library/fullyResponsive"
import UniversalLink from "library/Loader/UniversalLink"
import { useParamState } from "library/useParamState"
import styled, { css } from "styled-components"
import {} from "gatsby"

import { blogConfig as data } from "../blogConfig/data"

import { projectTextStyles as textStyles } from "../blogConfig/templateText"
// const textStyles = data.projectTextStyles
const colors = data.projectColors

export default function Categories({
	categoriesData,
}: { categoriesData: string[] }) {
	const [, setCategory] = useParamState("category")

	const categoriesEls = categoriesData.map((item) => {
		return (
			<Category type="button" key={item} onClick={() => setCategory(item)}>
				{item}
			</Category>
		)
	})

	return (
		<Wrapper>
			<CategoryHeader>
				Categories
				<StyledIcon />
			</CategoryHeader>
			{categoriesEls}
		</Wrapper>
	)
}

const Wrapper = styled.div`
  ${fresponsive(css`
    display: grid;
    gap: 5px;
    grid-row: 1 / -2;
    margin-bottom: 64px;
  `)}

  ${ftablet(css`
    gap: 10px;
  `)}

  ${fmobile(css`
    grid-template-columns: auto 1fr;
    place-items: start;
    gap: 10px 45px;
    padding-top: 25px;
    padding-bottom: 30px;
    margin-bottom: 48px;
    border-bottom: 1px solid ${colors.neutral300};
  `)}
`

const CategoryHeader = styled.div`
  ${textStyles.sh2};
  color: ${colors.neutralBlack};

  ${fresponsive(css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  `)}

  ${ftablet(css`
    margin-bottom: 10px;
  `)}

  ${fmobile(css`
    padding-top: 8px;
    margin-bottom: 0;
    grid-row: 1 / 7;
  `)}
`

const StyledIcon = styled(data.categoriesIcon)`
  ${fresponsive(css`
    width: 18px;
    height: 18px;
  `)}

  ${fmobile(css`
    width: 16px;
    height: 16px;
  `)}
`

const Category = styled(UniversalLink)`
  ${textStyles.sh4}
  color: ${colors.neutral800};

  ${fresponsive(css`
    padding: 8px 10px;
  `)}

  ${ftablet(css`
    ${textStyles.bodyL}
  `)}

  ${fmobile(css`
    height: 30px;
    display: grid;
    place-items: center;
    grid-column: -2;
    ${textStyles.sh3}
  `)}
`
