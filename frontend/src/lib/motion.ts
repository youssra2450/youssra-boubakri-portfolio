import type { CSSProperties, PointerEvent } from "react";

/**
 * Small helpers of the Motion v3 system (docs/SPEC.md §3.2). Everything visual lives in
 * styles/index.css; these only feed CSS custom properties.
 */

/**
 * Pointer-move handler for `.spotlight` surfaces: writes the cursor position to
 * `--spot-x` / `--spot-y`. Ignored for touch input (the effect is for fine pointers).
 */
export function trackSpotlight(event: PointerEvent<HTMLElement>): void {
  if (event.pointerType === "touch") return;
  const element = event.currentTarget;
  const rect = element.getBoundingClientRect();
  element.style.setProperty("--spot-x", `${Math.round(event.clientX - rect.left)}px`);
  element.style.setProperty("--spot-y", `${Math.round(event.clientY - rect.top)}px`);
}

/** Inline style exposing a stagger index as `--i` (used by CSS delays). */
export function staggerIndex(index: number, style?: CSSProperties): CSSProperties {
  return { ...style, "--i": index } as CSSProperties;
}

/** Inline style made of CSS custom properties, e.g. `cssVars({ "--i": 2, "--packet-distance": "24px" })`. */
export function cssVars(vars: Record<`--${string}`, string | number>, style?: CSSProperties): CSSProperties {
  return { ...style, ...vars } as CSSProperties;
}

/** "Let's work together" → ["Let's", "work", "together"]. */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}
