export const makeResponsiveGrid = ({
	sourceDesignWidth,
	columnCount,
	gutter,
	margin,
}: {
	/**
	 * how wide is the frame this grid is inside?
	 */
	sourceDesignWidth: number
	/**
	 * how many columns to generate
	 */
	columnCount: number
	/**
	 * space on either side of the grid
	 */
	margin: string
	/**
	 * space between columns
	 */
	gutter: string
}) => {
	if (columnCount < 2) throw new Error("Column count must be at least 2")

	const hasDeadCenter = columnCount % 2 === 0
	const centerGutter = hasDeadCenter
		? `
            calc(${gutter} / 2)
            [dead-center] 
            calc(${gutter} / 2)
        `
		: gutter
	const centerIndex = Math.floor(columnCount / 2) - 1

	const columns = Array.from(
		{ length: columnCount },
		(_, i) =>
			`[column-${i + 1}-start] 1fr [column-${i + 1}-end] ${
				// last column has no gutter
				i === columnCount - 1
					? ""
					: // middle columns have an extra grid line
						i === centerIndex
						? centerGutter
						: gutter
			}`,
	)

	return `
		[fullbleed-start]
		${margin}
		[scaled-main-start]
		calc(calc(100vw - ${sourceDesignWidth}px) / 2)
		[main-start] 0
		${columns.join("\n")}
		0 [main-end]
		calc(calc(100vw - ${sourceDesignWidth}px) / 2)
		[scaled-main-end]
		${margin}
		[fullbleed-end]
	`
}
