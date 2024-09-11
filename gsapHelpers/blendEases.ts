import gsap from 'gsap'

/**
 * @see https://gsap.com/docs/v3/HelperFunctions/helpers/blendEases/
 */
export function blendEases(startEase: gsap.EaseString | gsap.EaseFunction, endEase: gsap.EaseString | gsap.EaseFunction, blender?: any) {
    var parse = function (ease:any) {
        return typeof ease === "function" ? ease : gsap.parseEase("power4.inOut");
      },
      s = gsap.parseEase(startEase),
      e = gsap.parseEase(endEase),
      blender = parse(blender);
    return function (v:any) {
      var b = blender(v);
      return s(v) * (1 - b) + e(v) * b;
    };
  }