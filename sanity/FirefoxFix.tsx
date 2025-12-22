"use client"

import { useInterval } from "ahooks"
import { useHMR } from "library/useHMR"

let hasWarned = false

const checkZeroWidthChars = (startNode: Node = document.body) => {
	if (process.env.NODE_ENV === "development") {
		const walk = (node: Node) => {
			if (window.lenis?.isScrolling) return

			if (node.nodeType === Node.TEXT_NODE) {
				const parent = node.parentElement
				// biome-ignore lint/suspicious/noMisleadingCharacterClass: from sanity
				const zeroWidthChars = /[\u200B\u200C\u200D\uFEFF]/g
				const hasStega = zeroWidthChars.test(node.textContent ?? "")

				if (parent && hasStega) {
					const computedStyle = getComputedStyle(parent)
					const letterSpacing = parseFloat(computedStyle.letterSpacing)

					if (letterSpacing < 0) {
						hasWarned = true
						console.error(
							"Steganography detected with negative letter spacing!",
							"You MUST use stegaClean() to remove the zero width characters.",
							parent,
						)
					}
				}
			} else {
				node.childNodes.forEach(walk)
			}
		}

		if (!hasWarned) walk(startNode)
	}
}

export const FirefoxFix = () => {
	useInterval(() => {
		checkZeroWidthChars()
	}, 1000)
	useHMR("postbuild", () => {
		hasWarned = false
	})

	return null
}
