import type { ComponentProps } from "react"
import { expectTypeOf, test } from "vitest"
import SanityImage, {
	type SanityImageWithAlt,
	type SanityImageWithoutAlt,
} from "./SanityImage"

const imageWithAlt: SanityImageWithAlt = {
	asset: { _ref: "image-with-alt" },
	data: null,
	alt: "Alt from Sanity",
	willHaveAlt: "true",
}

const imageWithoutAlt: SanityImageWithoutAlt = {
	asset: { _ref: "image-without-alt" },
	data: null,
	willHaveAlt: "false",
}

test("images with Sanity-provided alt do not accept an explicit alt prop", () => {
	const _ok = <SanityImage src={imageWithAlt} />

	// @ts-expect-error alt should come from Sanity for this image shape
	const _err = <SanityImage src={imageWithAlt} alt="override" />

	expectTypeOf(imageWithAlt).toMatchTypeOf<SanityImageWithAlt>()
	expectTypeOf<ComponentProps<typeof SanityImage>>().toHaveProperty("src")
})

test("images without Sanity-provided alt require an explicit alt prop", () => {
	const _ok = <SanityImage src={imageWithoutAlt} alt="Decorative product shot" />

	// @ts-expect-error alt is required when the image does not provide one
	const _err = <SanityImage src={imageWithoutAlt} />

	expectTypeOf(imageWithoutAlt).toMatchTypeOf<SanityImageWithoutAlt>()
})
