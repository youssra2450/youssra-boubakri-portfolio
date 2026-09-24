import { useLayoutEffect } from "react";

/**
 * Prevent the page behind an overlay from scrolling while the calling component is mounted.
 * The scrollbar width is compensated to avoid a layout jump on desktop browsers.
 * Runs as a layout effect so the lock is released before any navigation scroll happens.
 */
export function useBodyScrollLock(): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
    const scrollbarWidth = window.innerWidth - root.clientWidth;

    root.style.overflow = "hidden";
    if (scrollbarWidth > 0) root.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      root.style.overflow = previous.overflow;
      root.style.paddingRight = previous.paddingRight;
    };
  }, []);
}
