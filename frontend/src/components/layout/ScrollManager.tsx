import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";

/** Scroll offsets per history entry, used to restore the position on back / forward. */
const savedPositions = new Map<string, number>();

/** How long to wait for a hash target that is rendered after data arrives. */
const HASH_TARGET_TIMEOUT_MS = 8000;

function findHashTarget(hash: string): HTMLElement | null {
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}

function revealTarget(target: HTMLElement, behavior: ScrollBehavior): void {
  target.scrollIntoView({ behavior, block: "start" });
  // Move keyboard focus with the view (sections are focusable with tabIndex=-1).
  if (target.tabIndex >= 0 || target.hasAttribute("tabindex")) target.focus({ preventScroll: true });
}

/**
 * Scroll to `hash` now, or as soon as the element appears (the home page renders its
 * sections after GET /api/portfolio resolves). Returns a cleanup function.
 */
function scrollToHash(hash: string, behavior: ScrollBehavior): () => void {
  const target = findHashTarget(hash);
  if (target) {
    revealTarget(target, behavior);
    return () => undefined;
  }
  const observer = new MutationObserver(() => {
    const element = findHashTarget(hash);
    if (!element) return;
    stop();
    revealTarget(element, "instant");
  });
  const timeout = window.setTimeout(() => stop(), HASH_TARGET_TIMEOUT_MS);
  function stop() {
    observer.disconnect();
    window.clearTimeout(timeout);
  }
  observer.observe(document.body, { childList: true, subtree: true });
  return stop;
}

/**
 * Scroll behaviour for the public site:
 * - new page → top (instant); same page → smooth scroll (CSS `scroll-behavior`, off under reduced motion);
 * - "/#section" → that section, waiting for it when content is still loading;
 * - back / forward → the position the visitor left.
 */
export function ScrollManager(): null {
  const { key, pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    const initial = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = initial;
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const save = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => savedPositions.set(key, window.scrollY));
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", save);
    };
  }, [key]);

  useLayoutEffect(() => {
    const firstRender = previousPathname.current === null;
    const samePage = previousPathname.current === pathname;
    previousPathname.current = pathname;

    if (navigationType === "POP") {
      const saved = savedPositions.get(key);
      if (saved !== undefined) {
        window.scrollTo({ top: saved, left: 0, behavior: "instant" });
        return;
      }
    }
    if (hash) return scrollToHash(hash, samePage ? "auto" : "instant");
    if (!firstRender) window.scrollTo({ top: 0, left: 0, behavior: samePage ? "auto" : "instant" });
  }, [key, pathname, hash, navigationType]);

  return null;
}
