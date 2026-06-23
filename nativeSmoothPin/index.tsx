import { endGoopAnimation, startGoopAnimation } from "./animations.css"

const css = String.raw

export default function nativeSmoothPin({
	goopLevel = 200,
	goopType = "both",
	top: topInput,
	containerAware = false,
}: {
	goopLevel?: number
	goopType?: "start" | "end" | "both"
	top: string
	/**
	 * add container-type: size to the element that contains your sticky element
	 * this let's us measure the size of that element in CSS.
	 */
	containerAware?: boolean
}) {
	const top = Number.parseFloat(topInput) === 0 ? "0.1px" : topInput

	const negativeTop = Number.parseFloat(top) <= 0
	if (negativeTop) {
		if (!containerAware)
			console.error(
				"nativeSmoothPin: top must be greater than 0 when containerAware is false",
			)
	} else {
		if (containerAware)
			console.warn(
				"nativeSmoothPin: containerAware is true, but you don't need it",
			)
	}

	if (negativeTop && goopType !== "start") {
		console.warn(
			"nativeSmoothPin: top is less than or equal to 0, nativeSmoothPin will not work for 'end' if your sticky element is taller than the viewport",
		)
	}

	return css`
		top: ${top};

		--start-goop-level: ${goopType === "end" ? 0 : goopLevel / 4}px;
		--end-goop-level: ${goopType === "start" ? 0 : -goopLevel / 4}px;

		animation-name: ${startGoopAnimation}, ${endGoopAnimation};
		/* stylelint-disable-next-line plugin/use-baseline */
		animation-timeline: view(y);
		${containerAware
			? css`
					/* stylelint-disable-next-line plugin/use-baseline */
					animation-range:
						entry-crossing calc(100dvh - ${top} - ${goopLevel}px) entry-crossing
							calc(100dvh - ${top} + ${goopLevel}px),
						entry calc(100vh + 100cqh - ${top} - 100% - ${goopLevel}px) entry
							calc(100vh + 100cqh - ${top} - 100% + ${goopLevel}px);
				`
			: css`
					/* stylelint-disable-next-line plugin/use-baseline */
					animation-range:
						entry-crossing calc(100dvh - ${top} - ${goopLevel}px) entry-crossing
							calc(100dvh - ${top} + ${goopLevel}px),
						exit-crossing calc(calc(-1 * ${top}) - ${goopLevel}px) exit-crossing
							calc(calc(-1 * ${top}) + ${goopLevel}px);
				`}
	`
}
