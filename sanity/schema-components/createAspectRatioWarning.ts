import type { ImageRule, ValidationContext } from "sanity"

interface ImageDimensions {
	width: number
	height: number
}

interface ImageValue {
	asset?: { _ref: string }
	crop?: {
		top?: number
		bottom?: number
		left?: number
		right?: number
	}
}

interface AspectRatioWarningOptions {
	/**
	 * Mapping of layout keys to dimensions or arrays of dimensions. (Required)
	 */
	specs: Record<string, ImageDimensions | ImageDimensions[]>
	/**
	 * The field name in the document that determines the layout.
	 * @default "layout"
	 */
	layoutField?: string
	/**
	 * Allowed aspect ratio difference.
	 * @default 0.15
	 */
	tolerance?: number
	/**
	 * Sanity API version for fetching image metadata.
	 * @default "2024-01-01"
	 */
	apiVersion?: string
	/**
	 * Optional custom message function for warning results.
	 */
	message?: (params: {
		status: "ok" | "close" | "off"
		percentOff: number
		effectiveWidth: number
		effectiveHeight: number
		idealHeightForWidth: number
		tolerancePercent: number
		isCropped: boolean
		layoutKey: string
	}) => string
}

/**
 * Create a Sanity image aspect ratio warning rule.
 *
 * This warning is advisory only: it will show a warning if the image does not match the expected aspect ratio,
 * but will not block publishing or saving the document.
 *
 * @returns A function to use as a Sanity warning rule.
 *
 * @example
 * // Example: Warn for images for different layouts, including array fields
 * const specs = {
 *   hero: { width: 1200, height: 600 }, // for single-image layouts
 *   gallery: [                         // for array fields (e.g., multiple images)
 *     { width: 400, height: 300 },     // first image in gallery
 *     { width: 600, height: 400 },     // second image in gallery
 *   ],
 *   feature: { width: 800, height: 800 },
 * }
 *
 * // In your schema field definition:
 * defineField({
 *   name: "images",
 *   type: "array",
 *   of: [
 *     universalImage({
 *       warning: createAspectRatioWarning({
 *         specs,
 *         layoutField: "layout", // the field in your document that determines which spec to use
 *         tolerance: 0.1,        // how close the aspect ratio must be
 *         message: ({ percentOff, layoutKey }) =>
 *           `Image for layout '${layoutKey}' is off by ${percentOff.toFixed(1)}%`,
 *       }),
 *     }),
 *   ],
 * })
 */

export const createAspectRatioWarning = (
	options: AspectRatioWarningOptions,
) => {
	const {
		specs,
		layoutField = "layout",
		tolerance = 0.15,
		apiVersion = "2024-01-01",
		message,
	} = options

	if (!specs) {
		throw new Error("createAspectRatioWarning: 'specs' option is required.")
	}

	return (Rule: ImageRule) =>
		Rule.custom(async (value: unknown, context: ValidationContext) => {
			// extract image value
			const imageValue = value as ImageValue | undefined
			if (!imageValue?.asset?._ref) return true

			// extract document and layout key
			const document = context.document as
				| { [key: string]: unknown }
				| undefined
			let layoutKey = "single"
			if (document && typeof document === "object" && layoutField in document) {
				const docLayout = document[layoutField]
				if (typeof docLayout === "string") {
					layoutKey = docLayout
				}
			}

			// check for valid layout key
			if (!layoutKey || !(layoutKey in specs)) {
				return `Layout field (${layoutField}) must be set to a valid value before warning on image dimensions`
			}

			// determine target dimensions (array or single)
			const spec = specs[layoutKey]
			let targetDimensions: ImageDimensions
			if (Array.isArray(spec)) {
				// for arrays, use the parent index
				const parentPath = context.path?.[context.path.length - 2]
				const arrayIndex = typeof parentPath === "number" ? parentPath : 0
				const candidate = spec[Math.min(arrayIndex, spec.length - 1)]
				if (!candidate) {
					return `No image spec found for layout '${layoutKey}' at index ${arrayIndex}`
				}
				targetDimensions = candidate
			} else if (spec) {
				targetDimensions = spec
			} else {
				return `No image spec found for layout '${layoutKey}'`
			}

			// fetch image dimensions from Sanity
			const client = context.getClient({ apiVersion })
			try {
				const dimensions = await client.fetch<{
					width: number
					height: number
				} | null>(`*[_id == $ref][0].metadata.dimensions`, {
					ref: imageValue.asset._ref,
				})
				if (!dimensions) return true
				// calculate effective dimensions (with crop if present)
				const { width: originalWidth, height: originalHeight } = dimensions
				let effectiveWidth = originalWidth
				let effectiveHeight = originalHeight
				if (
					imageValue.crop &&
					(imageValue.crop.top ||
						imageValue.crop.bottom ||
						imageValue.crop.left ||
						imageValue.crop.right)
				) {
					const cropWidth =
						1 - (imageValue.crop.left || 0) - (imageValue.crop.right || 0)
					const cropHeight =
						1 - (imageValue.crop.top || 0) - (imageValue.crop.bottom || 0)
					effectiveWidth = Math.round(originalWidth * cropWidth)
					effectiveHeight = Math.round(originalHeight * cropHeight)
				}
				// aspect ratio math
				const aspectRatio = effectiveWidth / effectiveHeight
				const idealAspectRatio =
					targetDimensions.width / targetDimensions.height
				const difference = Math.abs(aspectRatio - idealAspectRatio)
				const status = imageValue.crop ? "Cropped" : "Original"
				const tolerancePercent = (tolerance * 100).toFixed(0)
				const idealHeightForWidth = Math.round(
					effectiveWidth / idealAspectRatio,
				)
				const percentOff = (difference / idealAspectRatio) * 100
				// return warning result
				if (aspectRatio === idealAspectRatio) {
					if (message) {
						return message({
							status: "ok",
							percentOff,
							effectiveWidth,
							effectiveHeight,
							idealHeightForWidth,
							tolerancePercent: Number(tolerancePercent),
							isCropped: !!imageValue.crop,
							layoutKey,
						})
					}
					return true
				} else if (difference <= tolerance) {
					if (message) {
						return message({
							status: "close",
							percentOff,
							effectiveWidth,
							effectiveHeight,
							idealHeightForWidth,
							tolerancePercent: Number(tolerancePercent),
							isCropped: !!imageValue.crop,
							layoutKey,
						})
					}
					return `✅ Close enough: Current ${status.toLowerCase()}: ${effectiveWidth}:${effectiveHeight}px. Target: ${effectiveWidth}:${idealHeightForWidth}px. Within ${tolerancePercent}% tolerance`
				} else {
					if (message) {
						return message({
							status: "off",
							percentOff,
							effectiveWidth,
							effectiveHeight,
							idealHeightForWidth,
							tolerancePercent: Number(tolerancePercent),
							isCropped: !!imageValue.crop,
							layoutKey,
						})
					}
					return `⚠️ ${percentOff.toFixed(1)}% off. Current ${status.toLowerCase()}: ${effectiveWidth}:${effectiveHeight}px. Target: ${effectiveWidth}:${idealHeightForWidth}px`
				}
			} catch (error) {
				// handle fetch/warning errors
				console.error("Warning error:", error)
				return true
			}
		}).warning()
}
