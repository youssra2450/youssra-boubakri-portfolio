import { useEffect, useState } from "react";

export interface UseInViewOptions {
  /** Stop observing after the element has been seen once (default true). */
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
}

/**
 * Track whether an element intersects the viewport.
 * Returns a callback ref to attach and the visibility flag. Without
 * IntersectionObserver support the element is reported visible immediately.
 */
export function useInView<T extends Element>({
  once = true,
  rootMargin = "0px 0px -8% 0px",
  threshold = 0,
}: UseInViewOptions = {}): [(node: T | null) => void, boolean] {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, once, rootMargin, threshold]);

  return [setNode, inView];
}
