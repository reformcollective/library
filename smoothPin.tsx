import { ScrollTrigger, gsap } from "gsap/all"

/**
 * creates a ScrollTrigger with a smoothly animated pin effect
 *
 * @param options options for the pinned ScrollTrigger
 * @param goopLevel the duration, in scroll distance, of the goop ease
 * @returns the ScrollTrigger instance
 */
export default function createSmoothPin({
	smoothType: goopType = "both",
	smoothLevel: goopLevel = 200,
	...options
}: Omit<ScrollTrigger.StaticVars, "pin"> & {
	/**
	 * you must specify a pin type! usePinType is a good way to do this
	 */
	pinType: "fixed" | "transform"
	/**
	 * trigger must be an element, and may not be a selector
	 */
	trigger: Element | null | undefined
	/**
	 * where should the smooth effect be applied?
	 * at the start of the pin, the end, or both?
	 */
	smoothType?: "in" | "out" | "both"
	/**
	 * how long, in pixels scrolled, should the smooth effect last?
	 */
	smoothLevel?: number
	/**
	 * pin: true is implied, although if you want to pin something other than the trigger, you can specify it here
	 */
	pin?: Element | null | undefined
}) {
	const tweens: gsap.core.Tween[] = []
	const trigger = ScrollTrigger.create({
		pin: true,
		...options,
		onRefresh: (...props) => {
			for (const trigger of tweens) {
				trigger.scrollTrigger?.refresh()
			}
			options.onRefresh?.(...props)
		},
	})

	if (options.pinType === "fixed") return trigger
	if (goopLevel === 0) return trigger

	// the dom element may not exist yet, so we need to wait for it to be created
	gsap.delayedCall(0, () => {
		const goop =
			options.pin?.parentElement ?? options.trigger?.parentElement ?? null

		/**
		 * goop at start
		 */
		if (goopType === "in" || goopType === "both") {
			tweens.push(
				gsap.fromTo(
					goop,
					{
						y: 0,
					},
					{
						immediateRender: false,
						y: goopLevel / 4,
						ease: "power1.in",
						scrollTrigger: {
							start: () => trigger.start - goopLevel,
							end: () => trigger.start,
							scrub: true,
						},
					},
				),
				gsap.fromTo(
					goop,
					{
						y: goopLevel / 4,
					},
					{
						immediateRender: false,
						y: 0,
						ease: "power1.out",
						scrollTrigger: {
							start: () => trigger.start,
							end: () => trigger.start + goopLevel,
							scrub: true,
						},
					},
				),
			)
		}

		/**
		 * goop at end
		 */
		if (goopType === "out" || goopType === "both") {
			tweens.push(
				gsap.fromTo(
					goop,
					{
						y: 0,
					},
					{
						immediateRender: false,
						y: -goopLevel / 4,
						ease: "power1.in",
						scrollTrigger: {
							start: () => trigger.end - goopLevel,
							end: () => trigger.end,
							scrub: true,
						},
					},
				),
				gsap.fromTo(
					goop,
					{
						y: -goopLevel / 4,
					},
					{
						immediateRender: false,
						y: 0,
						ease: "power1.out",
						scrollTrigger: {
							start: () => trigger.end,
							end: () => trigger.end + goopLevel,
							scrub: true,
						},
					},
				),
			)
		}
	})

	return trigger
}
