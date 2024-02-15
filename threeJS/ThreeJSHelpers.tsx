import type { PerformanceMonitorApi } from "@react-three/drei"
import { PerformanceMonitor } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import { isBrowser } from "library/functions"
import { useEffect, useState } from "react"

const getDevicePixelRatio = () => {
	if (!isBrowser()) return 1

	return window.devicePixelRatio
}

export default function AdaptivePixelRatio() {
	const sendDPRtoThree = useThree((state) => state.setDpr)
	const [DPR, setDPR] = useState(getDevicePixelRatio())

	useEffect(() => {
		const roundedToNearestTenth = Math.round(DPR * 10) / 10
		sendDPRtoThree(roundedToNearestTenth)
	}, [DPR, sendDPRtoThree])

	const incline = () => {
		const maxDPR = getDevicePixelRatio()

		setDPR((previous) => {
			const newDPR = previous + 0.1
			return Math.min(newDPR, maxDPR)
		})
	}

	const decline = (e: PerformanceMonitorApi) => {
		const minDPR = 0.5

		const factorToDecrease = 1 - e.factor

		setDPR((previous) => {
			const newDPR = previous - factorToDecrease
			return Math.max(newDPR, minDPR)
		})
	}

	return <PerformanceMonitor onIncline={incline} onDecline={decline} />
}
