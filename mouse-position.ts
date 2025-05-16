type Output = {
	screenX: number
	screenY: number
	clientX: number
	clientY: number
	pageX: number
	pageY: number
	elementX: number
	elementY: number
	elementH: number
	elementW: number
	elementPosX: number
	elementPosY: number
	isWithinElement: boolean
}

export const subscribeToMousePosition = (
	onChange: (coordinates: Output) => void,
	target?: HTMLElement | null,
) => {
	const latestPosition: Output = {
		screenX: Number.NaN,
		screenY: Number.NaN,
		clientX: Number.NaN,
		clientY: Number.NaN,
		pageX: Number.NaN,
		pageY: Number.NaN,
		elementX: Number.NaN,
		elementY: Number.NaN,
		elementH: Number.NaN,
		elementW: Number.NaN,
		elementPosX: Number.NaN,
		elementPosY: Number.NaN,
		isWithinElement: false,
	}

	const mouseMoveHandler = (event: MouseEvent) => {
		latestPosition.screenX = event.screenX
		latestPosition.screenY = event.screenY
		latestPosition.clientX = event.clientX
		latestPosition.clientY = event.clientY
		latestPosition.pageX = event.pageX
		latestPosition.pageY = event.pageY

		if (target) {
			const targetRect = target.getBoundingClientRect()
			latestPosition.elementX = event.clientX - targetRect.left
			latestPosition.elementY = event.clientY - targetRect.top
			latestPosition.elementH = targetRect.height
			latestPosition.elementW = targetRect.width
			latestPosition.elementPosX = targetRect.left
			latestPosition.elementPosY = targetRect.top

			latestPosition.isWithinElement =
				latestPosition.elementX >= 0 &&
				latestPosition.elementX <= latestPosition.elementW &&
				latestPosition.elementY >= 0 &&
				latestPosition.elementY <= latestPosition.elementH
		}

		onChange(latestPosition)
	}

	const scrollHandler = () => {
		if (target) {
			const targetRect = target.getBoundingClientRect()
			latestPosition.elementX = latestPosition.clientX - targetRect.left
			latestPosition.elementY = latestPosition.clientY - targetRect.top
			latestPosition.elementH = targetRect.height
			latestPosition.elementW = targetRect.width
			latestPosition.elementPosX = targetRect.left
			latestPosition.elementPosY = targetRect.top

			latestPosition.isWithinElement =
				latestPosition.elementX >= 0 &&
				latestPosition.elementX <= latestPosition.elementW &&
				latestPosition.elementY >= 0 &&
				latestPosition.elementY <= latestPosition.elementH
		}

		// scroll handler should not fire before our mouse moves
		if (!Number.isNaN(latestPosition.screenX)) {
			onChange(latestPosition)
		}
	}

	const onLeaveWindow = () => {
		latestPosition.isWithinElement = false
		onChange(latestPosition)
	}

	window.addEventListener("mousemove", mouseMoveHandler)
	window.addEventListener("scroll", scrollHandler)
	document.addEventListener("mouseleave", onLeaveWindow)
	window.addEventListener("blur", onLeaveWindow)
	return {
		unsubscribe: () => {
			window.removeEventListener("mousemove", mouseMoveHandler)
			window.removeEventListener("scroll", scrollHandler)
			document.removeEventListener("mouseleave", onLeaveWindow)
			window.removeEventListener("blur", onLeaveWindow)
		},
	}
}
