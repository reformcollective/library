import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

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
	const trigger = ScrollTrigger.create({
		pin: true,
		...options,
	})

	const goop =
		options.pin?.parentElement ?? options.trigger?.parentElement ?? null
	if (options.pinType === "fixed") return trigger
	if (goopLevel === 0) return trigger

	/**
	 * goop at start
	 */
	if (goopType === "in" || goopType === "both") {
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
		)
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
		)
	}

	/**
	 * goop at end
	 */
	if (goopType === "out" || goopType === "both") {
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
		)
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
		)
	}

	return trigger
}
