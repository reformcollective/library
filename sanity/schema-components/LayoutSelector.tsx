import { type StringInputProps, set } from "sanity"
import { styled, css, unresponsive } from "library/styled"

/**
 * Props for the LayoutSelector component.
 * @property previews - A mapping of layout option values to image URLs for preview display.
 * @example
 * import layout1Preview from "../sections/preview/layout1.png"
 * const layoutPreviews = { "layout-1": layout1Preview.src }
 * <LayoutSelector {...props} previews={layoutPreviews} />
 */
interface LayoutSelectorProps extends StringInputProps {
	/**
	 * A mapping of layout option values to image URLs for preview display.
	 * @default {}
	 */
	previews: Record<string, string>
}

/**
 * A styled layout selector for Sanity string fields, displaying image previews for each option.
 *
 * @param props - LayoutSelectorProps including previews mapping and all StringInputProps.
 * @returns A grid of selectable layout options with image previews.
 *
 * @example
 * import layout1Preview from "../sections/preview/layout1.png"
 * const layoutPreviews = { "layout-1": layout1Preview.src }
 * <LayoutSelector {...props} previews={layoutPreviews} />
 */
export function LayoutSelector(props: LayoutSelectorProps) {
	const { onChange, value, schemaType, previews } = props
	const options = schemaType.options?.list || []

	return (
		<Grid>
			{options.map((option) => {
				const optionValue = typeof option === "string" ? option : option.value
				const optionTitle = typeof option === "string" ? option : option.title
				const selected = value === optionValue
				return (
					<LayoutButton
						type="button"
						key={optionValue}
						onClick={() => onChange(set(optionValue))}
						data-selected={selected}
					>
						{optionValue && previews[optionValue] && (
							<PreviewImage
								aria-label={optionTitle || ""}
								role="img"
								style={{ backgroundImage: `url(${previews[optionValue]})` }}
							/>
						)}
						<OptionLabel data-selected={selected}>{optionTitle}</OptionLabel>
					</LayoutButton>
				)
			})}
		</Grid>
	)
}

const Grid = styled(
	"div",
	unresponsive(css`
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	`),
)

const LayoutButton = styled(
	"button",
	unresponsive(css`
		padding: 12px;
		border: 2px solid #e4e4e7;
		border-radius: 8px;
		background: white;
		cursor: pointer;
		text-align: center;
		transition: all 0.2s;

		&[data-selected="true"] {
			border-color: #2276fc;
			background: #f0f6ff;
		}
	`),
)

const PreviewImage = styled(
	"div",
	unresponsive(css`
		width: 100%;
		height: 120px;
		background-size: cover;
		background-position: center;
		border-radius: 4px;
		margin-bottom: 8px;
	`),
)

const OptionLabel = styled(
	"div",
	unresponsive(css`
		font-size: 14px;
		font-weight: 400;

		&[data-selected="true"] {
			font-weight: 600;
		}
	`),
)
