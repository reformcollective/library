"use client"

import { useInterval } from "ahooks"
import { browserData } from "library/deviceDetection"
import { useHMR } from "library/useHMR"
import { stegaClean } from "next-sanity"
import { toast } from "sonner"

let hasWarned = false

// biome-ignore lint/suspicious/noMisleadingCharacterClass: directly copied from sanity
const zeroWidthChars = /[\u200B\u200C\u200D\uFEFF]/g

const checkZeroWidthChars = (startNode: Node = document.body) => {
	const walk = (node: Node) => {
		if (window.lenis?.isScrolling) return

		if (node.nodeType === Node.TEXT_NODE) {
			const parent = node.parentElement
			const hasStega = zeroWidthChars.test(node.textContent ?? "")

			if (parent && hasStega) {
				const computedStyle = getComputedStyle(parent)
				const letterSpacing = parseFloat(computedStyle.letterSpacing)

				// remove the stega and replace the content
				if (letterSpacing !== 0) {
					const cleanContent = stegaClean(node.textContent ?? "")
					node.textContent = cleanContent

					if (!hasWarned) {
						hasWarned = true
						toast.info("Some draft mode features are disabled in Firefox")
					}
				}
			}
		} else {
			node.childNodes.forEach(walk)
		}
	}

	walk(startNode)
}

export const FirefoxFix = () => {
	useInterval(() => {
		if (browserData.isFireFox) checkZeroWidthChars()
	}, 1000)
	useHMR("postbuild", () => {
		hasWarned = false
		checkZeroWidthChars()
	})

	return null
}
