import { type NumberInputProps, set, unset } from "sanity"
import { styled, css, unresponsive } from "library/styled"

/**
 * Options for creating a slider input component.
 * @property min Minimum value for the slider (default: 0)
 * @property max Maximum value for the slider (default: 100)
 * @property step Step value for the slider (default: 1)
 */

/**
 * Usage example:
 * const PercentageSlider = createSliderInput({ min: 0, max: 100, step: 1, unit: '%' });
 *
 * Then use <PercentageSlider /> as the input component for a Sanity number field.
 */

interface CreateSliderOptions {
	/**
	 * Minimum value for the slider.
	 * @default 0
	 */
	min?: number

	/**
	 * Maximum value for the slider.
	 * @default 100
	 */
	max?: number

	/**
	 * Step value for the slider.
	 * @default 1
	 */
	step?: number

	/**
	 * Unit string to display after the value label.
	 */
	unit?: string
}

/**
 * Factory function to create a slider input React component for Sanity forms.
 *
 * @param options - Configuration options for the slider.
 * @returns Slider input component for Sanity number fields.
 */

export function createSliderInput(options: CreateSliderOptions = {}) {
	const { min = 0, max = 100, step = 1, unit } = options

	/**
	 * Slider input component for Sanity number fields.
	 *
	 * @param props - Props from Sanity number input.
	 * @returns Slider input element.
	 */
	return function SliderInput(props: NumberInputProps) {
		const { onChange, value = 0 } = props

		/**
		 * Handles slider value change event.
		 *
		 * @param event - Change event from input.
		 */
		const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = Number(event.target.value)
			onChange(newValue ? set(newValue) : unset())
		}

		return (
			<SliderWrapper>
				<StyledInput
					type="range"
					min={min}
					max={max}
					step={step}
					value={value || 0}
					onChange={handleChange}
				/>
				<ValueLabel>
					{value}
					{unit ? unit : "%"}
				</ValueLabel>
			</SliderWrapper>
		)
	}
}

// Styled components moved outside the function to avoid redeclaration and reachability issues
const SliderWrapper = styled(
	"div",
	unresponsive(css`
		display: flex;
		align-items: center;
		gap: 12px;
	`),
)

const StyledInput = styled(
	"input",
	unresponsive(css`
		flex: 1;
		accent-color: #7c3aed;
		height: 4px;
		border-radius: 2px;
		background: linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%);

		&::-webkit-slider-thumb {
			appearance: none;
			width: 18px;
			height: 18px;
			border-radius: 50%;
			background: #fff;
			border: 2px solid #7c3aed;
			box-shadow: 0 2px 6px rgb(0 0 0 / 10%);
			cursor: pointer;
		}

		&::-moz-range-thumb {
			width: 18px;
			height: 18px;
			border-radius: 50%;
			background: #fff;
			border: 2px solid #7c3aed;
			box-shadow: 0 2px 6px rgb(0 0 0 / 10%);
			cursor: pointer;
		}

		&::-ms-thumb {
			width: 18px;
			height: 18px;
			border-radius: 50%;
			background: #fff;
			border: 2px solid #7c3aed;
			box-shadow: 0 2px 6px rgb(0 0 0 / 10%);
			cursor: pointer;
		}

		&::-webkit-slider-runnable-track {
			height: 4px;
			border-radius: 2px;
			background: transparent;
		}

		&::-ms-fill-lower {
			background: transparent;
		}

		&::-ms-fill-upper {
			background: transparent;
		}

		&:focus {
			outline: none;
			box-shadow: 0 0 0 2px #a78bfa44;
		}
	`),
)

const ValueLabel = styled(
	"span",
	unresponsive(css`
		min-width: 40px;
		text-align: right;
	`),
)
