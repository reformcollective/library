// import { graphql, useStaticQuery } from "gatsby"
// import { ReactComponent as CategoryIconSVG } from "images/blog/categoryIcon.svg"
import UniversalLink from "library/Loader/UniversalLink"
import { fmobile, fresponsive, ftablet } from "library/fullyResponsive"
import { useParamState } from "library/useParamState"
import styled, { css } from "styled-components"
import colors from "../styles/template-colors"
import textStyles from "../styles/template-text"

export default function Categories() {
	const [, setCategory] = useParamState("category")

	// TODO: Uncomment when Contentful is connected
	// const categories: Queries.CategoriesQuery = useStaticQuery(graphql`
	//   query Categories {
	//     allContentfulPageBlogPost {
	//       items: distinct(field: {categories: SELECT})
	//     }
	//   }
	// `)

	// const categoriesEls = categories.allContentfulPageBlogPost.items.map(
	// 	(item) => {
	// 		return (
	// 			<Category type="button" key={item} onClick={() => setCategory(item)}>
	// 				{item}
	// 			</Category>
	// 		)
	// 	},
	// )

	// TODO: Delete dummy data
	const categoriesEls = ["Category 1", "Category 2", "Category 3"].map(
		(item) => {
			return (
				<Category type="button" key={item} onClick={() => setCategory(item)}>
					{item}
				</Category>
			)
		},
	)

	return (
		<Wrapper>
			<CategoryHeader>
				{/* <CategoryIcon /> */}
				Categories
			</CategoryHeader>
			{categoriesEls}
		</Wrapper>
	)
}

const Wrapper = styled.div`
  ${fresponsive(css`
    color: ${colors.green};
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
    padding-bottom: 50px;
    margin-bottom: 20px;
    border-top: 1px solid ${colors.black};
    border-bottom: 1px solid ${colors.black};
  `)}
`

const CategoryHeader = styled.div`
  ${textStyles.bodyL};
  ${fresponsive(css`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 27px;
  `)}
  ${ftablet(css`
    margin-bottom: 32px;
  `)}
  ${fmobile(css`
    grid-row: 1 / 7;
    ${textStyles.titleL}
  `)}
`

// const CategoryIcon = styled(CategoryIconSVG)`
//   ${fresponsive(css`
//     width: 18px;
//     height: 18px;
//   `)}
// `

const Category = styled(UniversalLink)`
  ${textStyles.bodyS}

  ${ftablet(css`
    ${textStyles.bodyL}
  `)}

  ${fmobile(css`
    height: 30px;
    display: grid;
    place-items: center;
    grid-column: -2;
    ${textStyles.bodyL}
  `)}
`
