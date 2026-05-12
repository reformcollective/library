"use client"

import { useEffect } from "react"

const HOTSPOT_CONTAINER_SELECTOR =
	'[class^="HotspotImageContainer-sc-"], [class*=" HotspotImageContainer-sc-"]'

function updateHotspotPreviewScale(container: Element) {
	const frame = container.firstElementChild
	const cropBox = frame?.children.item(1)
	if (!(container instanceof HTMLElement) || !(cropBox instanceof HTMLElement))
		return

	const width = Number.parseFloat(cropBox.style.width)
	const height = Number.parseFloat(cropBox.style.height)
	if (
		!Number.isFinite(width) ||
		!Number.isFinite(height) ||
		width <= 0 ||
		height <= 0
	) {
		return
	}

	const scale = Math.max(100 / width, 100 / height)
	container.dataset.hotspotCoverPreview = ""
	container.style.setProperty("--studio-hotspot-cover-scale", scale.toString())
}

function updateHotspotPreviewScales(root: ParentNode = document) {
	root
		.querySelectorAll(HOTSPOT_CONTAINER_SELECTOR)
		.forEach(updateHotspotPreviewScale)
}

export function StudioHotspotCoverPreviews() {
	useEffect(() => {
		updateHotspotPreviewScales()

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === "attributes") {
					updateHotspotPreviewScales()
					return
				}

				for (const node of mutation.addedNodes) {
					if (!(node instanceof Element)) continue

					if (node.matches(HOTSPOT_CONTAINER_SELECTOR)) {
						updateHotspotPreviewScale(node)
					}
					updateHotspotPreviewScales(node)
				}
			}
		})

		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ["style"],
			childList: true,
			subtree: true,
		})

		return () => observer.disconnect()
	}, [])

	return null
}
