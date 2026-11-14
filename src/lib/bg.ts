import type { CSSProperties } from "react";

/**
 * Shared background style for the slide canvas, thumbnails, presentation and
 * exports. Gradient strings (including multi-layer mesh and shorthand
 * patterns with position/size) must go through the `background` shorthand —
 * assigning them to `backgroundImage` drops the position/size/color parts
 * and browsers reject the whole value.
 */
export function backgroundStyle(
  bgColor?: string,
  bgImage?: string,
  bgFit?: string,
): CSSProperties {
  const bg = typeof bgColor === "string" && bgColor ? bgColor : "#ffffff";
  if (bgImage) {
    return {
      backgroundColor: bg.includes("gradient(") ? undefined : bg,
      backgroundImage: `url(${bgImage})`,
      backgroundSize: bgFit ?? "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  if (bg.includes("gradient(")) return { background: bg };
  return { backgroundColor: bg };
}
