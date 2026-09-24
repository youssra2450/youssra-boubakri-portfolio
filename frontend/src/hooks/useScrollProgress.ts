import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Page scroll progress (0 → 1) written to the `--scroll-progress` custom property of the
 * returned callback ref's element — no React re-render per frame (rAF-throttled).
 */
export function usePageScrollProgress<T extends HTMLElement>(): (node: T | null) => void {
  const [node, setNode] = useState<T | null>(null);

  useEffect(() => {
    if (!node) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? clamp01(window.scrollY / max) : 0;
      node.style.setProperty("--scroll-progress", progress.toFixed(4));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Content arrives from the API after mount: follow the document height too.
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resize?.observe(document.body);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resize?.disconnect();
    };
  }, [node]);

  return setNode;
}

export interface ScrollLinkedProgressOptions {
  /** Viewport line (fraction of the height from the top) the element's progress is measured against. */
  anchor?: number;
}

/**
 * Scroll-linked progress of an element (0 when its top reaches the anchor line, 1 when its
 * bottom does), written to `--progress` on the element. Scroll listeners are only attached
 * while the element is on screen. Reduced motion or no IntersectionObserver → 1 (final state).
 */
export function useScrollLinkedProgress<T extends HTMLElement>({
  anchor = 0.7,
}: ScrollLinkedProgressOptions = {}): (node: T | null) => void {
  const [node, setNode] = useState<T | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!node) return;
    const write = (value: number) => node.style.setProperty("--progress", value.toFixed(4));
    if (reducedMotion || typeof IntersectionObserver === "undefined") {
      write(1);
      return;
    }

    let frame = 0;
    let listening = false;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const line = window.innerHeight * anchor;
      write(clamp01((line - rect.top) / Math.max(1, rect.height)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) {
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
      } else {
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
      }
    };

    const observer = new IntersectionObserver((entries) => {
      listen(entries.some((entry) => entry.isIntersecting));
      update();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      listen(false);
      cancelAnimationFrame(frame);
    };
  }, [node, anchor, reducedMotion]);

  return setNode;
}
