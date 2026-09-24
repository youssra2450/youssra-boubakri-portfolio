import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export interface UseCountUpOptions {
  /** Start counting (e.g. when the element enters the viewport). */
  enabled?: boolean;
  /** Animation length in ms (the design system caps it at 900 ms). */
  duration?: number;
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

/**
 * Animate an integer from 0 to `target` once `enabled` becomes true.
 * With reduced motion the final value is returned immediately.
 */
export function useCountUp(target: number, { enabled = true, duration = 900 }: UseCountUpOptions = {}): number {
  const reducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const animate = enabled && !reducedMotion;

  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    let startedAt: number | null = null;
    const step = (now: number) => {
      startedAt ??= now;
      const progress = Math.min(1, (now - startedAt) / duration);
      setValue(Math.round(target * easeOutCubic(progress)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [animate, target, duration]);

  if (reducedMotion) return target;
  return enabled ? value : 0;
}
