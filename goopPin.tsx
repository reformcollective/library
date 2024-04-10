import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

/**
 * creates a ScrollTrigger with a smoothly animated pin effect
 * NOTE! this should be used in combo with useAnimation and recreateOnResize: true
 *
 * @param options options for the pinned ScrollTrigger
 * @param goopLevel the duration, in scroll distance, of the goop ease
 * @returns the ScrollTrigger instance
 */
export default function createGoopPin({
	goopType = "both",
	goopLevel = 200,
	...options
}: Omit<ScrollTrigger.StaticVars, "pin"> & {
	pinType: "fixed" | "transform"
	trigger: Element | null | undefined
	goopType?: "in" | "out" | "both"
	goopLevel?: number
}) {
	const trigger = ScrollTrigger.create({
		pin: true,
		...options,
	})

	const goop =
		(options.pinType === "fixed"
			? options.trigger
			: options.trigger?.parentElement) ?? null

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
					start: trigger.start - goopLevel,
					end: trigger.start,
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
					start: trigger.start,
					end: trigger.start + goopLevel,
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
					start: trigger.end - goopLevel,
					end: trigger.end,
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
					start: trigger.end,
					end: trigger.end + goopLevel,
					scrub: true,
				},
			},
		)
	}

	return trigger
}
