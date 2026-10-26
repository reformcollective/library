import { gsap, ScrollTrigger } from "gsap/all"

const SUBSTEP = 1 / 240
const MAX_DT = 1 / 20

/**
 * A damped spring that follows a ScrollTrigger's progress, integrated on `gsap.ticker`.
 * Returns a cleanup function.
 */
export const springScrub = ({
	trigger,
	start,
	end,
	stiffness,
	damping,
	length,
	onValue,
}: {
	trigger: Element
	start: string
	end: string
	stiffness: number
	damping: number
	/** the number of steps the progress is spread across, read each tick */
	length: () => number
	/** called every tick with the spring's position, 0-1 */
	onValue: (position: number) => void
}) => {
	let target = 0
	let position = 0
	let velocity = 0
	let moving = false
	let seeded = false
	let lastTime = performance.now()

	const tick = () => {
		const now = performance.now()
		const dt = Math.min((now - lastTime) / 1000, MAX_DT)
		lastTime = now
		if (!moving) return

		const steps = Math.max(1, Math.ceil(dt / SUBSTEP))
		const h = dt / steps
		for (let i = 0; i < steps; i++) {
			velocity += (stiffness * (target - position) - damping * velocity) * h
			position += velocity * h
		}

		// settled once within a quarter of a frame and barely moving
		const frame = 1 / Math.max(1, length())
		if (Math.abs(target - position) < frame * 0.25 && Math.abs(velocity) < frame * 2) {
			position = target
			velocity = 0
			moving = false
		}
		onValue(position)
	}

	const scrollTrigger = ScrollTrigger.create({
		trigger,
		start,
		end,
		invalidateOnRefresh: true,
		onUpdate: (self) => {
			target = self.progress
			moving = true
		},
		onRefresh: (self) => {
			target = self.progress
			if (!seeded) {
				seeded = true
				position = target
				onValue(position)
			}
		},
	})

	gsap.ticker.add(tick)

	return () => {
		gsap.ticker.remove(tick)
		scrollTrigger.kill()
	}
}
